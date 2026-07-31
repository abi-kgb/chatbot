from rest_framework import serializers
from .models import Conversation, Message, Group, GroupMember, GroupMessage, Call, PollVote
from users.serializers import UserSerializer

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    replied_to = serializers.SerializerMethodField()
    poll_votes = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ('id', 'conversation', 'sender', 'content', 'file', 'message_type', 'metadata', 'timestamp', 'is_read', 'is_edited', 'is_deleted', 'reply_to', 'replied_to', 'poll_votes')
        read_only_fields = ('sender',)

    def get_poll_votes(self, obj):
        if obj.message_type == 'poll':
            votes = obj.votes.all()
            return [{'user_id': v.user.id, 'option_id': v.option_id} for v in votes]
        return None

    def get_replied_to(self, obj):
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender': obj.reply_to.sender.username,
                'content': obj.reply_to.content,
                'is_deleted': obj.reply_to.is_deleted,
                'has_file': bool(obj.reply_to.file)
            }
        return None

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_pinned = serializers.SerializerMethodField()
    is_favourite = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()
    is_archived = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ('id', 'participants', 'created_at', 'updated_at', 'last_message', 'unread_count', 'is_pinned', 'is_favourite', 'is_muted', 'is_archived', 'is_blocked')

    def get_is_pinned(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.pinned_by.filter(id=request.user.id).exists()
        return False

    def get_is_favourite(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favourited_by.filter(id=request.user.id).exists()
        return False

    def get_is_muted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.muted_by.filter(id=request.user.id).exists()
        return False

    def get_is_archived(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.archived_by.filter(id=request.user.id).exists()
        return False

    def get_is_blocked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            participants = obj.participants.all()
            if len(participants) == 2:
                other_user = [p for p in participants if p.id != request.user.id]
                if other_user:
                    return request.user.blocked_users.filter(id=other_user[0].id).exists()
        return False

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-timestamp').first()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None
        
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

class GroupMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = GroupMember
        fields = ('id', 'user', 'role', 'joined_at')

class GroupMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    replied_to = serializers.SerializerMethodField()
    poll_votes = serializers.SerializerMethodField()

    class Meta:
        model = GroupMessage
        fields = ('id', 'group', 'sender', 'content', 'file', 'message_type', 'metadata', 'timestamp', 'is_edited', 'is_deleted', 'reply_to', 'replied_to', 'poll_votes')
        read_only_fields = ('sender',)

    def get_poll_votes(self, obj):
        if obj.message_type == 'poll':
            votes = obj.votes.all()
            return [{'user_id': v.user.id, 'option_id': v.option_id} for v in votes]
        return None

    def get_replied_to(self, obj):
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'sender': obj.reply_to.sender.username,
                'content': obj.reply_to.content,
                'is_deleted': obj.reply_to.is_deleted,
                'has_file': bool(obj.reply_to.file)
            }
        return None

class GroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_pinned = serializers.SerializerMethodField()
    is_favourite = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()
    is_archived = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ('id', 'name', 'avatar', 'created_at', 'members', 'last_message', 'unread_count', 'is_pinned', 'is_favourite', 'is_muted', 'is_archived')

    def get_is_pinned(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.pinned_by.filter(id=request.user.id).exists()
        return False

    def get_is_favourite(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favourited_by.filter(id=request.user.id).exists()
        return False

    def get_is_muted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.muted_by.filter(id=request.user.id).exists()
        return False

    def get_is_archived(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.archived_by.filter(id=request.user.id).exists()
        return False

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-timestamp').first()
        if last_msg:
            return GroupMessageSerializer(last_msg).data
        return None
        
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            try:
                member = obj.members.get(user=request.user)
                return obj.messages.filter(timestamp__gt=member.last_read_at).exclude(sender=request.user).count()
            except GroupMember.DoesNotExist:
                return 0
        return 0

class CallSerializer(serializers.ModelSerializer):
    caller = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)

    class Meta:
        model = Call
        fields = ('id', 'caller', 'receiver', 'is_video', 'status', 'duration', 'timestamp')
        read_only_fields = ('caller',)

