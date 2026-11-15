import os
import logging
import requests
from datetime import date, timedelta
from django.conf import settings
from django.db.models import Count, Q, Exists, OuterRef
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ResearchTopic,
    ResearchPaper,
    PaperSummary,
    UserFollowedTopic,
    UserPaperAccess,
)
from .serializers import (
    ResearchTopicSerializer,
    ResearchPaperSerializer,
    ResearchPaperListSerializer,
    PaperSummarySerializer,
)

logger = logging.getLogger(__name__)
from .services import (
    get_or_create_paper_summary,
    seed_default_topics,
    fetch_arxiv_papers,
    ingest_huggingface_papers,
    ingest_openalex_papers,
)


def deduct_student_paper_credit(user, paper, auth_header: str):
    """
    Deducts 1 AI credit from the student's YHub credit wallet.
    Returns (success: bool, error_payload: dict | None).
    """
    yhub_url = getattr(
        settings,
        "YHUB_INTERNAL_URL",
        os.environ.get("YHUB_INTERNAL_URL", "http://yhub-backend:8000"),
    )
    headers = {"Authorization": auth_header, "Content-Type": "application/json"}
    payload = {
        "amount": 1,
        "description": f"AI Paper Summary: {paper.title[:50]}",
        "idempotency_key": f"paper_summary:{user.id}:{paper.id}",
        "metadata": {"paper_id": str(paper.id), "paper_title": paper.title},
    }

    try:
        resp = requests.post(
            f"{yhub_url}/api/credits/deduct/", json=payload, headers=headers, timeout=5
        )
        if resp.status_code == 402:
            err_data = resp.json() if resp.content else {}
            return False, {
                "error": "Insufficient AI credits",
                "available": err_data.get("available", 0),
                "required": 1,
                "message": err_data.get(
                    "error", "1 AI credit is required to summarize this research paper."
                ),
            }
        elif resp.status_code not in (200, 201):
            logger.warning(
                f"Credit deduction failed with status {resp.status_code}: {resp.text}"
            )
    except Exception as e:
        logger.warning(f"Could not reach YHub for credit deduction: {e}")

    return True, None


class ResearchPaperListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not ResearchTopic.objects.exists():
            seed_default_topics()

        queryset = ResearchPaper.objects.select_related("primary_topic", "summary").all()

        if request.user.is_authenticated:
            unlocked_subquery = UserPaperAccess.objects.filter(
                user=request.user, paper=OuterRef("pk")
            )
            queryset = queryset.annotate(is_unlocked=Exists(unlocked_subquery))

        view = request.query_params.get("view", "latest")
        topic_param = request.query_params.get("topic", "All")
        source_param = request.query_params.get("source", "All")
        period_param = request.query_params.get("period", "month")
        sort_param = request.query_params.get("sort", "newest")
        search_query = request.query_params.get("search", "").strip()

        # Filter by Period (strictly bounded to today and past)
        today = date.today()
        if period_param == "today":
            queryset = queryset.filter(published_date=today)
        elif period_param == "week":
            queryset = queryset.filter(published_date__gte=today - timedelta(days=7), published_date__lte=today)
        elif period_param == "month":
            queryset = queryset.filter(published_date__gte=today - timedelta(days=30), published_date__lte=today)
        else:
            queryset = queryset.filter(published_date__lte=today)

        # Filter by Topic
        if topic_param and topic_param != "All":
            queryset = queryset.filter(primary_topic__name__iexact=topic_param)

        # Filter by Source
        if source_param and source_param != "All":
            queryset = queryset.filter(source__iexact=source_param)

        # Filter by Following (User's followed topics)
        if view == "following":
            if request.user.is_authenticated:
                followed_topic_ids = UserFollowedTopic.objects.filter(
                    user=request.user
                ).values_list("topic_id", flat=True)
                queryset = queryset.filter(primary_topic_id__in=followed_topic_ids)
            else:
                # Fallback for unauthenticated/guest testing
                followed_names = request.query_params.getlist("followed_topics")
                if followed_names:
                    queryset = queryset.filter(primary_topic__name__in=followed_names)
                else:
                    return Response({"results": [], "count": 0})

        # Text Search
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query)
                | Q(abstract__icontains=search_query)
                | Q(authors__icontains=search_query)
            )

        # Sorting
        if sort_param == "cited":
            queryset = queryset.order_by("-citations_count", "-published_date")
        elif sort_param == "upvoted":
            queryset = queryset.order_by("-upvotes_count", "-published_date")
        elif sort_param == "newest":
            queryset = queryset.order_by("-published_date", "-upvotes_count")
        else:
            queryset = queryset.order_by("-upvotes_count", "-published_date", "-citations_count")

        # Limit / Pagination
        limit = request.query_params.get("limit")
        total_count = queryset.count()
        if limit and limit.isdigit():
            queryset = queryset[: int(limit)]

        # Lightweight list serializer (omits heavy nested summary text fields)
        serializer = ResearchPaperListSerializer(queryset, many=True)
        return Response({
            "count": total_count,
            "results": serializer.data,
        })


class ResearchPaperDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        paper = get_object_or_404(
            ResearchPaper.objects.select_related("primary_topic", "summary"), pk=pk
        )
        serializer = ResearchPaperSerializer(paper)
        return Response(serializer.data)


class SummarizePaperView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        paper = get_object_or_404(
            ResearchPaper.objects.select_related("primary_topic", "summary"), pk=pk
        )
        user = request.user if request.user.is_authenticated else None

        if not user:
            return Response(
                {"error": "Please sign in to summarize research papers with AI."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if this specific user has previously unlocked this paper
        already_unlocked = UserPaperAccess.objects.filter(user=user, paper=paper).exists()
        credits_deducted = 0

        if not already_unlocked:
            is_admin = (
                getattr(user, "is_staff", False)
                or getattr(user, "is_superuser", False)
                or getattr(user, "role", "") == "admin"
            )
            # 1st time this student is summarizing this paper: deduct 1 AI credit from YHub wallet
            auth_header = request.headers.get("Authorization", "")
            success, err_payload = deduct_student_paper_credit(user, paper, auth_header)
            if not success and not is_admin and err_payload:
                return Response(err_payload, status=status.HTTP_402_PAYMENT_REQUIRED)
            if success:
                credits_deducted = 1

            # Record this unlock so subsequent views for this user are free
            UserPaperAccess.objects.get_or_create(user=user, paper=paper)

        summary, is_cached = get_or_create_paper_summary(paper, user=user)
        serializer = PaperSummarySerializer(summary)

        return Response(
            {
                "cached": is_cached,
                "credits_deducted": credits_deducted,
                "summary": serializer.data,
                "message": "AI summary unlocked",
            },
            status=status.HTTP_200_OK,
        )


class ResearchTopicListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not ResearchTopic.objects.exists():
            seed_default_topics()
        week_ago = date.today() - timedelta(days=7)

        topics = ResearchTopic.objects.filter(is_active=True).annotate(
            papers_count=Count("papers"),
            new_this_week=Count("papers", filter=Q(papers__published_date__gte=week_ago)),
        )

        if request.user.is_authenticated:
            user_followed = UserFollowedTopic.objects.filter(
                user=request.user, topic=OuterRef("pk")
            )
            topics = topics.annotate(is_followed=Exists(user_followed))

        serializer = ResearchTopicSerializer(topics, many=True)
        return Response(serializer.data)


class ToggleFollowTopicView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, topic_name):
        topic = get_object_or_404(ResearchTopic, name__iexact=topic_name)
        record = UserFollowedTopic.objects.filter(user=request.user, topic=topic).first()

        if record:
            record.delete()
            return Response({"topic": topic.name, "followed": False, "message": f"Unfollowed {topic.name}"})
        else:
            UserFollowedTopic.objects.create(user=request.user, topic=topic)
            return Response({"topic": topic.name, "followed": True, "message": f"Following {topic.name}"})


class UserFollowedTopicsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        followed_names = list(
            UserFollowedTopic.objects.filter(user=request.user)
            .select_related("topic")
            .values_list("topic__name", flat=True)
        )
        return Response({"followed_topics": followed_names})


class IngestArxivPapersView(APIView):
    """
    Triggers live paper sync from Hugging Face Daily Papers (and optional arXiv fallback).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        seed_default_topics()
        
        # 1. Primary Sync: Hugging Face Daily Papers (curated, code repos, upvotes)
        hf_result = ingest_huggingface_papers(limit=50)

        # 2. OpenAlex AI papers sync (peer-reviewed, open access direct PDF links)
        oa_result = ingest_openalex_papers(max_per_topic=2)

        # 3. Secondary arXiv sync if specifically requested in body
        include_arxiv = request.data.get("include_arxiv", False) if isinstance(request.data, dict) else False
        arxiv_ingested = 0
        if include_arxiv:
            topics = ResearchTopic.objects.filter(is_active=True)
            for t in topics:
                query = t.search_query or f"cat:cs.AI AND {t.name}"
                fetched = fetch_arxiv_papers(search_query=query, max_results=2)
                for p_data in fetched:
                    _, created = ResearchPaper.objects.get_or_create(
                        external_id=p_data["external_id"],
                        defaults={
                            "title": p_data["title"],
                            "abstract": p_data["abstract"],
                            "authors": p_data["authors"],
                            "published_date": p_data["published_date"],
                            "source": p_data["source"],
                            "paper_url": p_data["paper_url"],
                            "pdf_url": p_data["pdf_url"],
                            "alphaxiv_url": p_data.get("alphaxiv_url"),
                            "reddit_search_url": p_data.get("reddit_search_url"),
                            "citations_count": p_data.get("citations_count", 0),
                            "primary_topic": t,
                        },
                    )
                    if created:
                        arxiv_ingested += 1

        return Response({
            "status": "success",
            "huggingface": hf_result,
            "openalex": oa_result,
            "new_papers_ingested": hf_result["ingested"] + oa_result["ingested"] + arxiv_ingested,
            "total_papers": ResearchPaper.objects.count(),
        })

