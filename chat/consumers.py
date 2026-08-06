import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
        self.room_group_name = f'chat_{self.chat_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket (for typing, read receipts, etc.)
    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')

        if event_type in ['typing_start', 'typing_stop', 'message_read', 'call_offer', 'call_answer', 'ice_candidate', 'call_end', 'call_reject']:
            # Broadcast to the group (excluding sender ideally, but we'll let frontend handle it)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_event',
                    'event': data
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'new_message',
            'message': message
        }))

    # Receive generic event from room group
    async def chat_event(self, event):
        # Send event to WebSocket
        await self.send(text_data=json.dumps(event['event']))

    # Receive updated message event from room group (edits, reactions, etc.)
    async def chat_message_updated(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'message_updated',
            'message': message
        }))

class GlobalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.global_group_name = f'user_{self.user_id}'

        await self.channel_layer.group_add(
            self.global_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.global_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')
        target_user = data.get('target_user')

        # Route global signaling messages to specific target users
        if event_type in ['call_offer', 'call_answer', 'ice_candidate', 'call_end', 'call_reject'] and target_user:
            await self.channel_layer.group_send(
                f'user_{target_user}',
                {
                    'type': 'global_event',
                    'event': data
                }
            )

    async def global_event(self, event):
        await self.send(text_data=json.dumps(event['event']))
