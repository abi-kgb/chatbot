"""
WSGI config for whatsapp_clone project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'whatsapp_clone.settings')

application = get_wsgi_application()

try:
    from django.core.management import call_command
    call_command('migrate', interactive=False)
except Exception as e:
    print('Startup WSGI migration check:', e)
