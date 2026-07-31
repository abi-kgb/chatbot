from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    pinned_by = models.ManyToManyField(User, related_name='pinned_conversations', blank=True)
    favourited_by = models.ManyToManyField(User, related_name='favourited_conversations', blank=True)
    muted_by = models.ManyToManyField(User, related_name='muted_conversations', blank=True)
    archived_by = models.ManyToManyField(User, related_name='archived_conversations', blank=True)
    deleted_by = models.ManyToManyField(User, related_name='deleted_conversations', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Conversation {self.id}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='chat_files/', null=True, blank=True)
    message_type = models.CharField(max_length=20, default='text')
    metadata = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.ManyToManyField(User, related_name='deleted_messages', blank=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')

    class Meta:
        ordering = ('timestamp',)

    def __str__(self):
        return f"Message {self.id} from {self.sender}"

class Group(models.Model):
    name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to='group_avatars/', null=True, blank=True)
    pinned_by = models.ManyToManyField(User, related_name='pinned_groups', blank=True)
    favourited_by = models.ManyToManyField(User, related_name='favourited_groups', blank=True)
    muted_by = models.ManyToManyField(User, related_name='muted_groups', blank=True)
    archived_by = models.ManyToManyField(User, related_name='archived_groups', blank=True)
    deleted_by = models.ManyToManyField(User, related_name='deleted_groups', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class GroupMember(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_memberships')
    role = models.CharField(max_length=20, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} in {self.group}"

class GroupMessage(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_messages')
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='chat_files/', null=True, blank=True)
    message_type = models.CharField(max_length=20, default='text')
    metadata = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.ManyToManyField(User, related_name='deleted_group_messages', blank=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')

    class Meta:
        ordering = ('timestamp',)

    def __str__(self):
        return f"Message {self.id} from {self.sender} in {self.group}"

class Call(models.Model):
    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_made')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_received')
    is_video = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='missed') # missed, completed, rejected
    duration = models.IntegerField(default=0) # in seconds
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-timestamp',)

    def __str__(self):
        return f"Call from {self.caller} to {self.receiver} ({self.status})"

class PollVote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    conversation_message = models.ForeignKey(Message, on_delete=models.CASCADE, null=True, blank=True, related_name='votes')
    group_message = models.ForeignKey(GroupMessage, on_delete=models.CASCADE, null=True, blank=True, related_name='votes')
    option_id = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'conversation_message', 'option_id'], name='unique_poll_vote_dm'),
            models.UniqueConstraint(fields=['user', 'group_message', 'option_id'], name='unique_poll_vote_group')
        ]

    def __str__(self):
        return f"{self.user} voted for {self.option_id}"
