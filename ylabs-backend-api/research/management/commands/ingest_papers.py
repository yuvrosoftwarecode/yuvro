import logging
from django.core.management.base import BaseCommand
from research.models import ResearchPaper, ResearchTopic
from research.services import (
    seed_default_topics,
    ingest_huggingface_papers,
    ingest_openalex_papers,
    fetch_arxiv_papers,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seed research topics and dynamically fetch live papers from Hugging Face, OpenAlex, and arXiv."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-hf",
            action="store_true",
            help="Skip fetching live papers from Hugging Face Daily Papers",
        )
        parser.add_argument(
            "--skip-openalex",
            action="store_true",
            help="Skip fetching live AI papers from OpenAlex API",
        )
        parser.add_argument(
            "--fetch-arxiv",
            action="store_true",
            help="Query live arXiv API for recent papers across active topics",
        )

    def handle(self, *args, **options):
        self.stdout.write("1. Seeding default research topics...")
        seed_default_topics()

        # 1. Hugging Face Daily Papers (live community-curated papers with GitHub repos)
        if not options.get("skip_hf"):
            self.stdout.write("2. Fetching live trending papers from Hugging Face Daily Papers API...")
            hf_res = ingest_huggingface_papers(limit=50)
            self.stdout.write(
                f"   Hugging Face: {hf_res['ingested']} new papers ingested, {hf_res['updated']} updated."
            )

        # 2. OpenAlex API (live peer-reviewed AI open-access papers with direct PDF links)
        if not options.get("skip_openalex"):
            self.stdout.write("3. Fetching live peer-reviewed AI papers from OpenAlex API...")
            oa_res = ingest_openalex_papers(max_per_topic=3)
            self.stdout.write(
                f"   OpenAlex: {oa_res['ingested']} new papers ingested, {oa_res['updated']} updated."
            )

        # 3. arXiv API (optional live fetch per topic)
        if options.get("fetch_arxiv"):
            self.stdout.write("4. Fetching live papers from arXiv API...")
            live_count = 0
            for topic in ResearchTopic.objects.filter(is_active=True):
                query = topic.search_query or f"cat:cs.AI AND {topic.name}"
                papers = fetch_arxiv_papers(search_query=query, max_results=2)
                for p_data in papers:
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
                            "citations_count": p_data.get("citations_count", 0),
                            "primary_topic": topic,
                        },
                    )
                    if created:
                        live_count += 1
            self.stdout.write(f"   arXiv: {live_count} live papers ingested.")

        total_count = ResearchPaper.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully synced research papers from live APIs. Total papers in DB: {total_count}"
            )
        )
