import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yhub-backend-api.settings')
django.setup()

from payment.models import Payment
import json

p = Payment.objects.order_by('-created_at').first()
if p:
    print(f"LATEST PAYMENT ID: {p.id}")
    print(f"Amount: {p.amount}")
    print(f"Currency: {p.currency}")
    print(f"Gateway Response: {json.dumps(p.gateway_response, indent=2)}")
else:
    print("NO PAYMENTS FOUND")
