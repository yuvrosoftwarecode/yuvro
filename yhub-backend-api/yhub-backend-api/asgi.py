
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "yhub-backend-api.settings")
django_asgi_app = get_asgi_application()

# WebSockets (only the TEST mock interview speech-to-text for now). Gunicorn keeps serving the
# REST API through wsgi.py; this ASGI app is run by a separate uvicorn process for /ws/ paths.
try:
    from channels.routing import ProtocolTypeRouter, URLRouter

    from mockinterviews.test_stt.auth import JwtQueryAuthMiddleware
    from mockinterviews.test_stt.routing import websocket_urlpatterns

    application = ProtocolTypeRouter({
        "http": django_asgi_app,
        "websocket": JwtQueryAuthMiddleware(URLRouter(websocket_urlpatterns)),
    })
except ImportError:  # channels not installed: plain Django ASGI, as before
    application = django_asgi_app
