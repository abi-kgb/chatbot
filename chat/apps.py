import os
import threading
import time
from django.apps import AppConfig

def scheduled_messages_worker():
    time.sleep(3)
    from django.utils import timezone
    from chat.models import ScheduledMessage, Message, GroupMessage
    from chat.serializers import MessageSerializer, GroupMessageSerializer
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    while True:
        try:
            now = timezone.now()
            due = ScheduledMessage.objects.filter(is_sent=False, scheduled_at__lte=now)
            if due.exists():
                channel_layer = get_channel_layer()
                for item in due:
                    if item.conversation:
                        msg = Message.objects.create(
                            conversation=item.conversation,
                            sender=item.sender,
                            content=item.content
                        )
                        serializer = MessageSerializer(msg)
                        group_name = f'chat_conv_{item.conversation.id}'
                    elif item.group:
                        msg = GroupMessage.objects.create(
                            group=item.group,
                            sender=item.sender,
                            content=item.content
                        )
                        serializer = GroupMessageSerializer(msg)
                        group_name = f'chat_group_{item.group.id}'
                    else:
                        continue

                    item.is_sent = True
                    item.save()

                    if channel_layer:
                        async_to_sync(channel_layer.group_send)(
                            group_name,
                            {
                                'type': 'chat_message',
                                'message': serializer.data
                            }
                        )
        except Exception as e:
            pass

        time.sleep(10)

class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chat'

    def ready(self):
        # Prevent running twice in reloader
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('RUN_MAIN'):
            thread = threading.Thread(target=scheduled_messages_worker, daemon=True)
            thread.start()
