from django.db import migrations

def create_default_agents(apps, schema_editor):
    AIAgent = apps.get_model('ai_assistant', 'AIAgent')
    
    # Create Gemini Agent
    AIAgent.objects.get_or_create(
        provider='gemini',
        model_name='gemini-2.5-flash',
        defaults={
            'name': 'Gemini 1.5 Flash',
            'description': 'Fast and efficient multimodal model by Google',
            'is_active': True,
            'max_tokens': 8192,
            'temperature': 0.7,
        }
    )

    # Note: Other agents are currently commented out in the factory, 
    # so we only create the one that works.

def remove_default_agents(apps, schema_editor):
    AIAgent = apps.get_model('ai_assistant', 'AIAgent')
    AIAgent.objects.filter(provider='gemini', model_name='gemini-2.5-flash').delete()

class Migration(migrations.Migration):

    dependencies = [
        ('ai_assistant', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_agents, remove_default_agents),
    ]
