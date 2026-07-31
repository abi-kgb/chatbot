from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from .models import Conversation, Message, Group, GroupMember, GroupMessage, Call
from .serializers import ConversationSerializer, MessageSerializer, GroupSerializer, GroupMessageSerializer, GroupMemberSerializer, CallSerializer

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.conversations.exclude(deleted_by=self.request.user)

    def create(self, request, *args, **kwargs):
        participant_ids = request.data.get('participants', [])
        if len(participant_ids) == 2:
            # Check if conversation already exists between these two users
            existing = Conversation.objects.filter(participants=participant_ids[0]).filter(participants=participant_ids[1])
            if existing.exists():
                conversation = existing.first()
                if request.user in conversation.deleted_by.all():
                    conversation.deleted_by.remove(request.user)
                serializer = self.get_serializer(conversation)
                return Response(serializer.data, status=status.HTTP_200_OK)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        conversation = serializer.save()
        participant_ids = self.request.data.get('participants', [])
        if participant_ids:
            conversation.participants.set(participant_ids)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        conversation = self.get_object()
        updated_count = conversation.messages.exclude(sender=request.user).filter(is_read=False).update(is_read=True)
        if updated_count > 0:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'chat_conv_{conversation.id}',
                {
                    'type': 'chat_event',
                    'event': {'type': 'messages_read', 'reader': request.user.username}
                }
            )
        return Response({'status': 'messages marked as read'})

    @action(detail=True, methods=['post'])
    def toggle_pin(self, request, pk=None):
        conversation = self.get_object()
        if conversation.pinned_by.filter(id=request.user.id).exists():
            conversation.pinned_by.remove(request.user)
            return Response({'status': 'unpinned'})
        else:
            conversation.pinned_by.add(request.user)
            return Response({'status': 'pinned'})

    @action(detail=True, methods=['post'])
    def toggle_favourite(self, request, pk=None):
        conversation = self.get_object()
        if conversation.favourited_by.filter(id=request.user.id).exists():
            conversation.favourited_by.remove(request.user)
            return Response({'status': 'unfavourited'})
        else:
            conversation.favourited_by.add(request.user)
            return Response({'status': 'favourited'})

    @action(detail=True, methods=['post'])
    def toggle_mute(self, request, pk=None):
        conversation = self.get_object()
        if conversation.muted_by.filter(id=request.user.id).exists():
            conversation.muted_by.remove(request.user)
            return Response({'status': 'unmuted'})
        else:
            conversation.muted_by.add(request.user)
            return Response({'status': 'muted'})

    @action(detail=True, methods=['post'])
    def toggle_archive(self, request, pk=None):
        conversation = self.get_object()
        if conversation.archived_by.filter(id=request.user.id).exists():
            conversation.archived_by.remove(request.user)
            return Response({'status': 'unarchived'})
        else:
            conversation.archived_by.add(request.user)
            return Response({'status': 'archived'})

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        conversation = self.get_object()
        # Add request.user to deleted_by for all messages in this conversation
        for msg in conversation.messages.all():
            msg.deleted_by.add(request.user)
        return Response({'status': 'cleared'})

    @action(detail=True, methods=['post'])
    def delete_chat(self, request, pk=None):
        conversation = self.get_object()
        for msg in conversation.messages.all():
            msg.deleted_by.add(request.user)
        conversation.deleted_by.add(request.user)
        return Response({'status': 'deleted'})

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_pk')
        if conversation_id:
            return Message.objects.filter(conversation_id=conversation_id).exclude(deleted_by=self.request.user).order_by('timestamp')
        return Message.objects.filter(conversation__participants=self.request.user).exclude(deleted_by=self.request.user)

    def create(self, request, *args, **kwargs):
        conversation_id = self.kwargs.get('conversation_pk') or request.data.get('conversation')
        if conversation_id:
            conversation = Conversation.objects.get(id=conversation_id)
            participants = conversation.participants.all()
            if len(participants) == 2:
                other_user = participants.exclude(id=request.user.id).first()
                if other_user and (other_user.blocked_users.filter(id=request.user.id).exists() or request.user.blocked_users.filter(id=other_user.id).exists()):
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("You cannot send messages to this user.")

        response = super().create(request, *args, **kwargs)
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        conversation_id = self.kwargs.get('conversation_pk') or request.data.get('conversation')
        if conversation_id:
            async_to_sync(channel_layer.group_send)(
                f'chat_conv_{conversation_id}',
                {
                    'type': 'chat_message',
                    'message': response.data
                }
            )
        return response

    def perform_create(self, serializer):
        import json
        metadata = self.request.data.get('metadata')
        if metadata and isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except:
                pass
            serializer.save(sender=self.request.user, metadata=metadata)
        else:
            serializer.save(sender=self.request.user)

    def perform_update(self, serializer):
        serializer.save(is_edited=True)
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        conversation_id = serializer.instance.conversation_id
        async_to_sync(channel_layer.group_send)(
            f'chat_conv_{conversation_id}',
            {
                'type': 'chat_event',
                'event': {'type': 'message_update', 'message': serializer.data}
            }
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Only the sender can delete their message
        if instance.sender != request.user:
            return Response({'error': 'You can only delete your own messages.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Soft delete
        instance.is_deleted = True
        instance.content = ""
        instance.file = None
        instance.save()
        
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_conv_{instance.conversation_id}',
            {
                'type': 'chat_event',
                'event': {'type': 'message_delete', 'message_id': instance.id}
            }
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def vote_poll(self, request, pk=None, conversation_pk=None):
        message = self.get_object()
        if message.message_type != 'poll' or not message.metadata or not message.metadata.get('poll'):
            return Response({'error': 'Message is not a poll'}, status=status.HTTP_400_BAD_REQUEST)

        option_id = request.data.get('option_id')
        if not option_id:
            return Response({'error': 'Option ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        allow_multiple = message.metadata['poll'].get('allow_multiple', False)
        
        from .models import PollVote
        
        existing_vote = PollVote.objects.filter(user=request.user, conversation_message=message, option_id=option_id).first()
        if existing_vote:
            existing_vote.delete()
        else:
            if not allow_multiple:
                PollVote.objects.filter(user=request.user, conversation_message=message).delete()
            PollVote.objects.create(user=request.user, conversation_message=message, option_id=option_id)

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_conv_{message.conversation_id}',
            {
                'type': 'chat_event',
                'event': {'type': 'message_update', 'message': self.get_serializer(message).data}
            }
        )
        return Response({'status': 'voted'})

class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        return Group.objects.filter(members__user=self.request.user).exclude(deleted_by=self.request.user).distinct()

    def perform_update(self, serializer):
        old_name = serializer.instance.name
        group = serializer.save()
        
        if 'name' in serializer.validated_data and old_name != group.name:
            content = f"{self.request.user.username} changed the group name to \"{group.name}\""
        elif 'avatar' in serializer.validated_data:
            content = f"{self.request.user.username} changed the group icon"
        else:
            content = f"{self.request.user.username} updated the group settings"

        sys_msg = GroupMessage.objects.create(
            group=group,
            sender=self.request.user,
            message_type='system',
            content=content
        )
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_group_{group.id}',
            {
                'type': 'chat_message',
                'message': GroupMessageSerializer(sys_msg).data
            }
        )
        async_to_sync(channel_layer.group_send)(
            f'chat_group_{group.id}',
            {
                'type': 'chat_event',
                'event': {
                    'type': 'group_updated',
                    'group': GroupSerializer(group).data
                }
            }
        )

    def perform_create(self, serializer):
        group = serializer.save()
        GroupMember.objects.create(group=group, user=self.request.user, role='admin')

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        user_id = request.data.get('user_id')
        if user_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                new_user = User.objects.get(id=user_id)
                member, created = GroupMember.objects.get_or_create(group=group, user=new_user)
                if created:
                    sys_msg = GroupMessage.objects.create(
                        group=group,
                        sender=request.user,
                        message_type='system',
                        content=f"{request.user.username} added {new_user.username}"
                    )
                    from channels.layers import get_channel_layer
                    from asgiref.sync import async_to_sync
                    channel_layer = get_channel_layer()
                    async_to_sync(channel_layer.group_send)(
                        f'chat_group_{group.id}',
                        {
                            'type': 'chat_message',
                            'message': GroupMessageSerializer(sys_msg).data
                        }
                    )
                return Response({'status': 'member added'})
            except User.DoesNotExist:
                return Response({'error': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        from django.utils import timezone
        group = self.get_object()
        try:
            member = group.members.get(user=request.user)
            member.last_read_at = timezone.now()
            member.save()
            
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'chat_group_{group.id}',
                {
                    'type': 'chat_event',
                    'event': {'type': 'messages_read', 'reader': request.user.username}
                }
            )
            return Response({'status': 'group marked as read'})
        except GroupMember.DoesNotExist:
            return Response({'error': 'not a member'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=['post'])
    def toggle_pin(self, request, pk=None):
        group = self.get_object()
        if group.pinned_by.filter(id=request.user.id).exists():
            group.pinned_by.remove(request.user)
            return Response({'status': 'unpinned'})
        else:
            group.pinned_by.add(request.user)
            return Response({'status': 'pinned'})

    @action(detail=True, methods=['post'])
    def toggle_favourite(self, request, pk=None):
        group = self.get_object()
        if group.favourited_by.filter(id=request.user.id).exists():
            group.favourited_by.remove(request.user)
            return Response({'status': 'unfavourited'})
        else:
            group.favourited_by.add(request.user)
            return Response({'status': 'favourited'})

    @action(detail=True, methods=['post'])
    def toggle_mute(self, request, pk=None):
        group = self.get_object()
        if group.muted_by.filter(id=request.user.id).exists():
            group.muted_by.remove(request.user)
            return Response({'status': 'unmuted'})
        else:
            group.muted_by.add(request.user)
            return Response({'status': 'muted'})

    @action(detail=True, methods=['post'])
    def toggle_archive(self, request, pk=None):
        group = self.get_object()
        if group.archived_by.filter(id=request.user.id).exists():
            group.archived_by.remove(request.user)
            return Response({'status': 'unarchived'})
        else:
            group.archived_by.add(request.user)
            return Response({'status': 'archived'})

    @action(detail=True, methods=['post'])
    def clear(self, request, pk=None):
        group = self.get_object()
        # Add request.user to deleted_by for all messages in this group
        for msg in group.messages.all():
            msg.deleted_by.add(request.user)
        return Response({'status': 'cleared'})

    @action(detail=True, methods=['post'])
    def exit_group(self, request, pk=None):
        group = self.get_object()
        # Remove user from group members
        try:
            member = group.members.get(user=request.user)
            member.delete()
        except GroupMember.DoesNotExist:
            pass
        # Add to deleted_by so it doesn't show in the sidebar anymore
        group.deleted_by.add(request.user)
        return Response({'status': 'exited'})

class GroupMessageViewSet(viewsets.ModelViewSet):
    serializer_class = GroupMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        group_id = self.kwargs.get('group_pk')
        if group_id:
            try:
                member = GroupMember.objects.get(group_id=group_id, user=self.request.user)
                return GroupMessage.objects.filter(group_id=group_id, timestamp__gte=member.joined_at).exclude(deleted_by=self.request.user).order_by('timestamp')
            except GroupMember.DoesNotExist:
                return GroupMessage.objects.none()
        return GroupMessage.objects.none()

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        group_id = self.kwargs.get('group_pk') or request.data.get('group')
        if group_id:
            async_to_sync(channel_layer.group_send)(
                f'chat_group_{group_id}',
                {
                    'type': 'chat_message',
                    'message': response.data
                }
            )
        return response

    def perform_create(self, serializer):
        import json
        metadata = self.request.data.get('metadata')
        if metadata and isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except:
                pass
            serializer.save(sender=self.request.user, metadata=metadata)
        else:
            serializer.save(sender=self.request.user)

    def perform_update(self, serializer):
        serializer.save(is_edited=True)
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        group_id = serializer.instance.group_id
        async_to_sync(channel_layer.group_send)(
            f'chat_group_{group_id}',
            {
                'type': 'chat_event',
                'event': {'type': 'message_update', 'message': serializer.data}
            }
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Only the sender can delete their message
        if instance.sender != request.user:
            return Response({'error': 'You can only delete your own messages.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Soft delete
        instance.is_deleted = True
        instance.content = ""
        instance.file = None
        instance.save()
        
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_group_{instance.group_id}',
            {
                'type': 'chat_event',
                'event': {'type': 'message_delete', 'message_id': instance.id}
            }
        )
        
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def vote_poll(self, request, pk=None, group_pk=None):
        message = self.get_object()
        if message.message_type != 'poll' or not message.metadata or not message.metadata.get('poll'):
            return Response({'error': 'Message is not a poll'}, status=status.HTTP_400_BAD_REQUEST)

        option_id = request.data.get('option_id')
        if not option_id:
            return Response({'error': 'Option ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        allow_multiple = message.metadata['poll'].get('allow_multiple', False)
        
        from .models import PollVote
        
        existing_vote = PollVote.objects.filter(user=request.user, group_message=message, option_id=option_id).first()
        if existing_vote:
            existing_vote.delete()
        else:
            if not allow_multiple:
                PollVote.objects.filter(user=request.user, group_message=message).delete()
            PollVote.objects.create(user=request.user, group_message=message, option_id=option_id)

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_group_{message.group_id}',
            {
                'type': 'chat_event',
                'event': {'type': 'message_update', 'message': self.get_serializer(message).data}
            }
        )
        return Response({'status': 'voted'})

class CallViewSet(viewsets.ModelViewSet):
    serializer_class = CallSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Call.objects.filter(
            Q(caller=self.request.user) | Q(receiver=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        receiver_id = self.request.data.get('receiver_id')
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            receiver = User.objects.get(id=receiver_id)
            serializer.save(caller=self.request.user, receiver=receiver)
        except User.DoesNotExist:
            pass # Return 400 ideally, but let's just let it fail or we should handle it.
            # Actually, perform_create doesn't easily return 400 without raising ValidationError.
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'receiver_id': 'Invalid user ID'})

from rest_framework.decorators import api_view, permission_classes
from django.core.files.base import ContentFile

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def forward_message(request):
    message_id = request.data.get('message_id')
    is_group = request.data.get('is_group_message', False)
    target_conversations = request.data.get('target_conversations', [])
    target_groups = request.data.get('target_groups', [])
    
    if not message_id or (not target_conversations and not target_groups):
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

    original_message = None
    if is_group:
        original_message = GroupMessage.objects.filter(id=message_id).first()
    else:
        original_message = Message.objects.filter(id=message_id).first()
        
    if not original_message:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)

    metadata = original_message.metadata or {}
    metadata['is_forwarded'] = True

    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()

    # Forward to conversations
    for conv_id in target_conversations:
        conv = Conversation.objects.filter(id=conv_id).first()
        if conv and request.user in conv.participants.all():
            new_msg = Message.objects.create(
                conversation=conv,
                sender=request.user,
                content=original_message.content,
                message_type=original_message.message_type,
                metadata=metadata
            )
            if original_message.file:
                new_msg.file = original_message.file
                new_msg.save()
            
            serializer = MessageSerializer(new_msg)
            async_to_sync(channel_layer.group_send)(
                f'chat_conv_{conv.id}',
                {
                    'type': 'chat_message',
                    'message': serializer.data
                }
            )

    # Forward to groups
    for group_id in target_groups:
        member = GroupMember.objects.filter(group_id=group_id, user=request.user).first()
        if member:
            new_msg = GroupMessage.objects.create(
                group_id=group_id,
                sender=request.user,
                content=original_message.content,
                message_type=original_message.message_type,
                metadata=metadata
            )
            if original_message.file:
                new_msg.file = original_message.file
                new_msg.save()
            
            serializer = GroupMessageSerializer(new_msg)
            async_to_sync(channel_layer.group_send)(
                f'chat_group_{group_id}',
                {
                    'type': 'chat_message',
                    'message': serializer.data
                }
            )

    return Response({'status': 'forwarded'})
