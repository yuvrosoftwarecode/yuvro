import json
from django.core.management.base import BaseCommand
from payment.models import PurchasableItem, PurchasableType

class Command(BaseCommand):
    help = "Seeds the Recruiter Pricing Plans into PurchasableItem"

    def handle(self, *args, **options):
        plans = [
            {
                "item_id": "recruiter_free_trial",
                "name": "Free Trial",
                "current_price": 0.00,
                "metadata": {
                    "tier": "free_trial",
                    "billing_cycle": "monthly",
                    "duration_days": 15,
                    "quotas": {
                        "candidate_attempts": 20,
                        "engineering_simulation_runs": 10,
                        "ai_interview_minutes": 15,
                        "recruiter_logins": 1
                    }
                }
            },
            {
                "item_id": "recruiter_starter_monthly",
                "name": "Starter Monthly",
                "current_price": 50.00,
                "metadata": {
                    "tier": "starter",
                    "billing_cycle": "monthly",
                    "quotas": {
                        "candidate_attempts": 50,
                        "engineering_simulation_runs": 10,
                        "ai_interview_minutes": 150,
                        "recruiter_logins": 1
                    }
                }
            },
            {
                "item_id": "recruiter_starter_yearly",
                "name": "Starter Yearly",
                "current_price": 600.00,
                "metadata": {
                    "tier": "starter",
                    "billing_cycle": "yearly",
                    "quotas": {
                        "candidate_attempts": 50,
                        "engineering_simulation_runs": 10,
                        "ai_interview_minutes": 150,
                        "recruiter_logins": 1
                    }
                }
            },
            {
                "item_id": "recruiter_growth_monthly",
                "name": "Growth Monthly",
                "current_price": 150.00,
                "metadata": {
                    "tier": "growth",
                    "billing_cycle": "monthly",
                    "quotas": {
                        "candidate_attempts": 150,
                        "engineering_simulation_runs": 40,
                        "ai_interview_minutes": 600,
                        "recruiter_logins": 3
                    }
                }
            },
            {
                "item_id": "recruiter_growth_yearly",
                "name": "Growth Yearly",
                "current_price": 1800.00,
                "metadata": {
                    "tier": "growth",
                    "billing_cycle": "yearly",
                    "quotas": {
                        "candidate_attempts": 150,
                        "engineering_simulation_runs": 40,
                        "ai_interview_minutes": 600,
                        "recruiter_logins": 3
                    }
                }
            },
            {
                "item_id": "recruiter_scale_monthly",
                "name": "Scale Monthly",
                "current_price": 499.00,
                "metadata": {
                    "tier": "scale",
                    "billing_cycle": "monthly",
                    "quotas": {
                        "candidate_attempts": 500,
                        "engineering_simulation_runs": 100,
                        "ai_interview_minutes": 1500,
                        "recruiter_logins": 5
                    }
                }
            },
            {
                "item_id": "recruiter_scale_yearly",
                "name": "Scale Yearly",
                "current_price": 5988.00,
                "metadata": {
                    "tier": "scale",
                    "billing_cycle": "yearly",
                    "quotas": {
                        "candidate_attempts": 500,
                        "engineering_simulation_runs": 100,
                        "ai_interview_minutes": 1500,
                        "recruiter_logins": 5
                    }
                }
            },
        ]

        for plan in plans:
            obj, created = PurchasableItem.objects.update_or_create(
                item_type=PurchasableType.RECRUITER_PLAN,
                item_id=plan["item_id"],
                defaults={
                    "name": plan["name"],
                    "current_price": plan["current_price"],
                    "metadata": plan["metadata"],
                    "product": "ylabs"
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created plan: {plan['name']}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Updated plan: {plan['name']}"))

        self.stdout.write(self.style.SUCCESS("Successfully seeded recruiter pricing plans."))
