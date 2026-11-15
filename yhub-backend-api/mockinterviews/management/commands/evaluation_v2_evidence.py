"""Shows the evidence recorded for an interview (read-only).

    python manage.py evaluation_v2_evidence                 # the 5 most recent interviews
    python manage.py evaluation_v2_evidence <submission_id> # one interview, with details
    python manage.py evaluation_v2_evidence --latest 20
"""
import json

from django.core.management.base import BaseCommand

from mockinterviews.evaluation_v2.evidence_check import summarize
from mockinterviews.evaluation_v2.recording import EVIDENCE_KEY
from mockinterviews.models import InterviewEvaluation, MockInterviewSubmission


class Command(BaseCommand):
    help = "Show the evidence recorded for post-interview evaluation (read-only)."

    def add_arguments(self, parser):
        parser.add_argument("submission_id", nargs="?")
        parser.add_argument("--latest", type=int, default=5)
        parser.add_argument("--raw", action="store_true", help="also print the raw evidence_v2 block")

    def handle(self, *args, **opts):
        if opts["submission_id"]:
            subs = MockInterviewSubmission.objects.filter(id=opts["submission_id"])
        else:
            subs = MockInterviewSubmission.objects.filter(interview_type="full_ai").order_by("-started_at")[: opts["latest"]]
        if not subs:
            self.stdout.write("No interview found.")
            return
        for sub in subs:
            state = sub.state_data or {}
            summary = summarize(state)
            queued = InterviewEvaluation.objects.filter(submission=sub).values_list("engine_version", "status", "attempts")
            self.stdout.write(self.style.MIGRATE_HEADING(f"\nInterview {sub.id}  status={sub.status}  started={sub.started_at:%Y-%m-%d %H:%M}"))
            for key, value in summary.items():
                if key != "issues":
                    self.stdout.write(f"  {key:30} {value}")
            self.stdout.write(f"  {'evaluation queue':30} {list(queued) or 'not queued yet (report not requested)'}")
            if summary["issues"]:
                for issue in summary["issues"]:
                    self.stdout.write(self.style.WARNING(f"  ISSUE: {issue}"))
            else:
                self.stdout.write(self.style.SUCCESS("  All expected evidence is recorded."))
            if opts["raw"]:
                self.stdout.write(json.dumps(state.get(EVIDENCE_KEY), indent=2, default=str))
