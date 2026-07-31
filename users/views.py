from rest_framework import generics, permissions
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = serializer.save()
        
        # Broadcast profile update to all contacts
        from chat.models import Conversation
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            conversations = Conversation.objects.filter(participants=user)
            target_user_ids = set()
            for c in conversations:
                for p in c.participants.all():
                    if p.id != user.id:
                        target_user_ids.add(p.id)
            
            for tid in target_user_ids:
                async_to_sync(channel_layer.group_send)(
                    f'user_{tid}',
                    {
                        'type': 'global_event',
                        'event': {
                            'type': 'profile_update',
                            'user_id': user.id,
                            'avatar': self.request.build_absolute_uri(user.avatar.url) if user.avatar else None,
                            'about': user.status_message,
                            'username': user.username
                        }
                    }
                )

class UserSearchView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        if query:
            return User.objects.filter(phone_number__icontains=query) | User.objects.filter(username__icontains=query)
        return User.objects.none()

from rest_framework.views import APIView
from django.utils import timezone

class HeartbeatView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        user.last_seen = timezone.now()
        user.save(update_fields=['last_seen'])
        return Response({'status': 'ok'})

class BlockUserView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    def post(self, request, user_id):
        try:
            target = User.objects.get(id=user_id)
            request.user.blocked_users.add(target)
            return Response({'status': 'blocked'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

class UnblockUserView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    def post(self, request, user_id):
        try:
            target = User.objects.get(id=user_id)
            request.user.blocked_users.remove(target)
            return Response({'status': 'unblocked'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

from rest_framework import viewsets
from .models import Contact
from .serializers import ContactSerializer

class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Contact.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
