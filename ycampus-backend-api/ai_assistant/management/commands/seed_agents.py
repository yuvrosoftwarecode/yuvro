from django.core.management.base import BaseCommand
from ai_assistant.models import AIAgent


class Command(BaseCommand):
    help = "Seed the database with sample AI agents"

    def handle(self, *args, **options):
        agents_data = [
            {
                "name": "Mock Interview",
                "provider": "anthropic",
                "model_name": "claude-sonnet-4-5-20250929",
                "description": "Anthropic Claude 4.5 Sonnet for Mock Interviews",
                "is_active": True,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            {
                "name": "AI Buddy",
                "provider": "gemini",
                "model_name": "gemini-3.1-flash-lite",
                "description": "Google Gemini 3.1 Flash Lite - Your personal learning assistant",
                "is_active": True,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            
        ]

        for agent_data in agents_data:
            agent, created = AIAgent.objects.get_or_create(
                provider=agent_data["provider"],
                model_name=agent_data["model_name"],
                defaults={
                    "name": agent_data["name"],
                    "description": agent_data["description"],
                    "is_active": agent_data["is_active"],
                    "max_tokens": agent_data["max_tokens"],
                    "temperature": agent_data["temperature"],
                },
            )

            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully created agent: {agent.name} ({agent.provider})"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Agent already exists: {agent.name} ({agent.provider})"
                    )
                )

        self.stdout.write(self.style.SUCCESS("✓ AI Agent seeding completed"))
