from rest_framework import serializers
from .models import ResearchTopic, ResearchPaper, PaperSummary, UserFollowedTopic


class PaperSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperSummary
        fields = [
            "id",
            "about",
            "problem",
            "approach",
            "results",
            "why",
            "limits",
            "developer_context",
            "model_used",
            "created_at",
        ]


class ResearchTopicSerializer(serializers.ModelSerializer):
    papers_count = serializers.IntegerField(read_only=True, default=0)
    new_this_week = serializers.IntegerField(read_only=True, default=0)
    is_followed = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = ResearchTopic
        fields = [
            "id",
            "name",
            "display_name",
            "description",
            "order",
            "papers_count",
            "new_this_week",
            "is_followed",
        ]


class ResearchPaperListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.
    Omits heavy nested summary text fields to save >80% network payload size.
    """
    topic = serializers.CharField(source="primary_topic.name", read_only=True)
    date = serializers.SerializerMethodField()
    description = serializers.CharField(source="abstract", read_only=True)
    url = serializers.CharField(source="paper_url", read_only=True)
    citations = serializers.IntegerField(source="citations_count", read_only=True)
    upvotes = serializers.IntegerField(source="upvotes_count", read_only=True)
    has_summary = serializers.SerializerMethodField()
    is_unlocked = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = ResearchPaper
        fields = [
            "id",
            "title",
            "authors",
            "abstract",
            "description",
            "published_date",
            "date",
            "source",
            "external_id",
            "paper_url",
            "url",
            "pdf_url",
            "github_url",
            "upvotes_count",
            "upvotes",
            "citations_count",
            "citations",
            "topic",
            "has_summary",
            "is_unlocked",
            "tags",
            "created_at",
        ]

    def get_date(self, obj):
        return obj.published_date.isoformat() if obj.published_date else None

    def get_has_summary(self, obj):
        return hasattr(obj, "summary") and obj.summary is not None


class ResearchPaperSerializer(serializers.ModelSerializer):
    """Full detail serializer with complete nested summary body."""
    topic = serializers.CharField(source="primary_topic.name", read_only=True)
    date = serializers.SerializerMethodField()
    description = serializers.CharField(source="abstract", read_only=True)
    url = serializers.CharField(source="paper_url", read_only=True)
    citations = serializers.IntegerField(source="citations_count", read_only=True)
    upvotes = serializers.IntegerField(source="upvotes_count", read_only=True)
    has_summary = serializers.SerializerMethodField()
    is_unlocked = serializers.BooleanField(read_only=True, default=False)
    summary = PaperSummarySerializer(read_only=True)

    class Meta:
        model = ResearchPaper
        fields = [
            "id",
            "title",
            "authors",
            "abstract",
            "description",
            "published_date",
            "date",
            "source",
            "external_id",
            "paper_url",
            "url",
            "pdf_url",
            "github_url",
            "upvotes_count",
            "upvotes",
            "citations_count",
            "citations",
            "topic",
            "has_summary",
            "is_unlocked",
            "summary",
            "tags",
            "created_at",
        ]

    def get_date(self, obj):
        return obj.published_date.isoformat() if obj.published_date else None

    def get_has_summary(self, obj):
        return hasattr(obj, "summary") and obj.summary is not None
