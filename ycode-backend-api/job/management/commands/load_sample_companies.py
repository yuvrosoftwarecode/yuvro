from django.core.management.base import BaseCommand
from job.models import Company


class Command(BaseCommand):
    help = "Load sample companies into the database"

    def handle(self, *args, **options):
        # Clear existing companies
        Company.objects.all().delete()

        companies_data = [
            {
                "name": "TechCorp Solutions",
                "domain": "Technology",
                "website": "https://techcorp.com",
                "size": "201-500",
                "description": "Leading technology solutions provider specializing in cloud infrastructure and AI-powered applications.",
                "location": "San Francisco, CA",
            },
            {
                "name": "InnovateLabs",
                "domain": "FinTech",
                "website": "https://innovatelabs.io",
                "size": "51-200",
                "description": "Revolutionary fintech startup building the future of digital payments and blockchain solutions.",
                "location": "New York, NY",
            },
            {
                "name": "DataDriven Inc",
                "domain": "Data Analytics",
                "website": "https://datadriven.com",
                "size": "11-50",
                "description": "Data analytics company helping businesses make informed decisions through advanced machine learning.",
                "location": "Austin, TX",
            },
            {
                "name": "CloudScale Systems",
                "domain": "Cloud Computing",
                "website": "https://cloudscale.net",
                "size": "501-1000",
                "description": "Enterprise cloud solutions provider with expertise in scalable infrastructure and DevOps automation.",
                "location": "Seattle, WA",
            },
            {
                "name": "MobileFirst Studios",
                "domain": "Mobile Development",
                "website": "https://mobilefirst.dev",
                "size": "1-10",
                "description": "Boutique mobile app development studio creating innovative iOS and Android applications.",
                "location": "Los Angeles, CA",
            },
        ]

        created_count = 0
        for company_data in companies_data:
            company, created = Company.objects.get_or_create(
                name=company_data["name"], defaults=company_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created company: {company.name}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Company already exists: {company.name}")
                )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully loaded {created_count} companies")
        )
