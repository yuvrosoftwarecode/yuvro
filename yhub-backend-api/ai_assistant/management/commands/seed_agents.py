from django.core.management.base import BaseCommand
from ai_assistant.models import AIAgent


class Command(BaseCommand):
    help = "Seed the database with sample AI agents"

    def handle(self, *args, **options):
        # 1. Migrate any legacy/deprecated models in database to modern counterparts
        legacy_model_mappings = {
            "claude-3-opus-20240229": ("anthropic", "Claude 3.5 Sonnet", "claude-3-5-sonnet-20241022", "Powerful AI model by Anthropic with strong reasoning", True),
            "claude-3-sonnet-20240229": ("anthropic", "Claude 3.5 Haiku", "claude-3-5-haiku-20241022", "Fast and efficient AI model by Anthropic", False),
            "gpt-4": ("openai", "GPT-4o", "gpt-4o", "Advanced AI model by OpenAI with superior reasoning capabilities", False),
            "gpt-3.5-turbo": ("openai", "GPT-4o Mini", "gpt-4o-mini", "Fast and efficient AI model by OpenAI", False),
        }

        for old_model, (provider, new_name, new_model, description, is_active) in legacy_model_mappings.items():
            legacy_qs = AIAgent.objects.filter(provider=provider, model_name=old_model)
            if legacy_qs.exists():
                target_agent = AIAgent.objects.filter(provider=provider, model_name=new_model).first()
                if target_agent:
                    for lagent in legacy_qs:
                        lagent.chat_sessions.update(ai_agent=target_agent)
                        lagent.delete()
                    self.stdout.write(self.style.SUCCESS(f"Re-linked sessions and merged legacy '{old_model}' -> '{new_model}'"))
                else:
                    legacy_qs.update(
                        name=new_name,
                        model_name=new_model,
                        description=description,
                        is_active=is_active,
                    )
                    self.stdout.write(self.style.SUCCESS(f"Updated legacy model '{old_model}' -> '{new_model}'"))

        # 2. Seed / Update current agents
        agents_data = [
            {
                "name": "GPT-4o",
                "provider": "openai",
                "model_name": "gpt-4o",
                "description": "Advanced AI model by OpenAI with superior reasoning capabilities",
                "is_active": False,
                "max_tokens": 8192,
                "temperature": 0.7,
            },
            {
                "name": "GPT-4o Mini",
                "provider": "openai",
                "model_name": "gpt-4o-mini",
                "description": "Fast and efficient AI model by OpenAI",
                "is_active": False,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            {
                "name": "Claude 3.5 Sonnet",
                "provider": "anthropic",
                "model_name": "claude-3-5-sonnet-20241022",
                "description": "Powerful AI model by Anthropic with strong reasoning",
                "is_active": True,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            {
                "name": "Claude 3.5 Haiku",
                "provider": "anthropic",
                "model_name": "claude-3-5-haiku-20241022",
                "description": "Fast and efficient AI model by Anthropic",
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
                "is_active": False,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
        ]

        for agent_data in agents_data:
            agent, created = AIAgent.objects.update_or_create(
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

            status_str = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{status_str} agent: {agent.name} ({agent.provider} - {agent.model_name})"
                )
            )

        self.stdout.write(self.style.SUCCESS("✓ AI Agent seeding completed"))
