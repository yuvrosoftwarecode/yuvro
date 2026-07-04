from django.core.management.base import BaseCommand
from ai_assistant.models import AIAgent


class Command(BaseCommand):
    help = "Seed the database with sample AI agents"

    def handle(self, *args, **options):
        agents_data = [
            {
                "name": "GPT-4",
                "provider": "openai",
                "model_name": "gpt-4",
                "description": "Advanced AI model by OpenAI with superior reasoning capabilities",
                # Disabled for now; Gemini is the active provider.
                "is_active": False,
                "max_tokens": 8192,
                "temperature": 0.7,
            },
            {
                "name": "GPT-3.5",
                "provider": "openai",
                "model_name": "gpt-3.5-turbo",
                "description": "Fast and efficient AI model by OpenAI",
                # Disabled for now; Gemini is the active provider.
                "is_active": False,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            {
                "name": "Claude 3 Opus",
                "provider": "anthropic",
                "model_name": "claude-3-opus-20240229",
                "description": "Powerful AI model by Anthropic with strong reasoning",
                # Disabled for now; Gemini is the active provider.
                "is_active": False,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            {
                "name": "Claude 3 Sonnet",
                "provider": "anthropic",
                "model_name": "claude-3-sonnet-20240229",
                "description": "Balanced AI model by Anthropic",
                # Disabled for now; Gemini is the active provider.
                "is_active": False,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            {
                "name": "Gemini 2.5 Flash",
                "provider": "gemini",
                "model_name": "gemini-2.5-flash",
                "description": "Google's latest Gemini 2.5 Flash model with high performance",
                "is_active": True,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            {
                "name": "Cohere Command",
                "provider": "cohere",
                "model_name": "command-nightly",
                "description": "Language model by Cohere for text generation",
                # Disabled for now; Gemini is the active provider.
                "is_active": False,
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
