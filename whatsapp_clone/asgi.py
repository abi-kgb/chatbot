"""
ASGI config for whatsapp_clone project.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'whatsapp_clone.settings')

# Initialize Django HTTP ASGI application
django_http_app = get_asgi_application()

# Fail-safe: Auto-run database migrations on startup to prevent missing tables
try:
    from django.core.management import call_command
    call_command('migrate', interactive=False)
except Exception as e:
    print('Startup migration check:', e)

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import chat.routing

application = ProtocolTypeRouter({
    "http": django_http_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
