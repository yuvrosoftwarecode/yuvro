from django.core.management.base import BaseCommand
from core.models import University, College

class Command(BaseCommand):
    help = "Seed universities and link them to colleges"

    def handle(self, *args, **options):
        universities_data = [
            {
                "name": "Osmania University",
                "short_form": "OU",
                "location": "Hyderabad, Telangana"
            },
            {
                "name": "Jawaharlal Nehru Technological University, Hyderabad",
                "short_form": "JNTUH",
                "location": "Hyderabad, Telangana"
            },
            {
                "name": "Anna University",
                "short_form": "AU",
                "location": "Chennai, Tamil Nadu"
            },
            {
                "name": "Kakatiya University",
                "short_form": "KU",
                "location": "Warangal, Telangana"
            }
        ]

        created_unis = {}
        for data in universities_data:
            uni, created = University.objects.get_or_create(
                name=data["name"],
                defaults={
                    "short_form": data["short_form"],
                    "location": data["location"]
                }
            )
            created_unis[data["short_form"]] = uni
            if created:
                self.stdout.write(self.style.SUCCESS(f"✓ Created university: {uni.name}"))
            else:
                self.stdout.write(f"University already exists: {uni.name}")

        # Link colleges to universities
        link_map = {
            "JNTU": "JNTUH",
            "Osmania": "OU"
        }

        for college_search, uni_code in link_map.items():
            try:
                college = College.objects.filter(name__icontains=college_search).first()
                if college and uni_code in created_unis:
                    college.university = created_unis[uni_code]
                    college.save()
                    self.stdout.write(self.style.SUCCESS(f"✓ Linked {college.name} to {created_unis[uni_code].name}"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not link {college_search} to {uni_code}: {str(e)}"))
