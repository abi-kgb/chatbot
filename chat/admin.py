from django.contrib import admin
from django.utils.html import format_html
from .models import Conversation, Message, Group, GroupMember, GroupMessage, Call, Status, StatusView

def format_message_content(obj):
    meta = obj.metadata or {}
    history = meta.get('edit_history', [])
    original = meta.get('original_content')
    if history and len(history) > 0 and history[0].get('from'):
        original = history[0].get('from')

    current_content = obj.content

    parts = []
    if obj.is_deleted:
        parts.append('<span style="color: #ef4444; font-weight: bold; background: #fee2e2; padding: 2px 6px; border-radius: 4px;">🚫 [DELETED]</span>')
    if obj.is_edited:
        count = len(history) if history else 1
        count_label = f" ({count} Edit{'s' if count > 1 else ''})"
        parts.append(f'<span style="color: #d97706; font-weight: bold; background: #fef3c7; padding: 2px 6px; border-radius: 4px;">✏️ [EDITED{count_label}]</span>')

    if obj.is_edited and history:
        orig_text = original or history[0].get('from', 'N/A')
        parts.append(f'<br/><strong>Content (Original):</strong> {orig_text}')

        for idx, step in enumerate(history, 1):
            to_text = step.get('to', 'N/A')
            parts.append(f'<br/><strong style="color: #d97706;">Edit {idx}:</strong> {to_text}')
    elif obj.is_edited:
        parts.append(f'<br/><strong>Content (Original):</strong> {original or "N/A"}')
        parts.append(f'<br/><strong style="color: #d97706;">Edit 1:</strong> {current_content or "N/A"}')
    else:
        text = current_content or original
        if text:
            content_str = text
        elif obj.file:
            content_str = f"📎 {obj.file.name}"
        elif obj.is_deleted:
            content_str = '<em style="color: #9ca3af;">(Legacy deleted message — content was erased before audit logging was installed)</em>'
        else:
            content_str = f"[{obj.message_type.capitalize()} Message]"

        parts.append(f'<strong>Content:</strong> {content_str}')

    return format_html(" ".join(parts))

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'get_receiver', 'get_content', 'message_type', 'is_edited', 'is_deleted', 'timestamp')
    list_filter = ('is_deleted', 'is_edited', 'message_type', 'timestamp')
    search_fields = ('content', 'sender__username', 'id')
    readonly_fields = ('timestamp', 'get_content_detail')

    def get_receiver(self, obj):
        receivers = obj.conversation.participants.exclude(id=obj.sender.id)
        return ", ".join([r.username for r in receivers]) if receivers.exists() else "Self"
    get_receiver.short_description = 'Receiver'

    def get_content(self, obj):
        return format_message_content(obj)
    get_content.short_description = 'Message Content & Audit'

    def get_content_detail(self, obj):
        return format_message_content(obj)
    get_content_detail.short_description = 'Full Content History'

@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'group', 'get_recipients', 'get_content', 'message_type', 'is_edited', 'is_deleted', 'timestamp')
    list_filter = ('is_deleted', 'is_edited', 'message_type', 'timestamp')
    search_fields = ('content', 'sender__username', 'id')
    readonly_fields = ('timestamp', 'get_content_detail')

    def get_recipients(self, obj):
        members = obj.group.members.exclude(user=obj.sender)
        usernames = [m.user.username for m in members]
        if len(usernames) > 3:
            return f"{', '.join(usernames[:3])} (+{len(usernames)-3} others)"
        return ", ".join(usernames) if usernames else "Group Members"
    get_recipients.short_description = 'Group Members'

    def get_content(self, obj):
        return format_message_content(obj)
    get_content.short_description = 'Message Content & Audit'

    def get_content_detail(self, obj):
        return format_message_content(obj)
    get_content_detail.short_description = 'Full Content History'

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_participants', 'created_at', 'updated_at')
    search_fields = ('participants__username',)

    def get_participants(self, obj):
        return ", ".join([p.username for p in obj.participants.all()])
    get_participants.short_description = 'Participants'

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'get_members_count', 'get_members_list', 'created_at')
    search_fields = ('name', 'members__user__username')

    def get_members_count(self, obj):
        return obj.members.count()
    get_members_count.short_description = 'Member Count'

    def get_members_list(self, obj):
        members = obj.members.all()
        usernames = [f"{m.user.username} ({m.role})" for m in members]
        return ", ".join(usernames) if usernames else "No Members"
    get_members_list.short_description = 'Members & Roles'

@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'group', 'user', 'role', 'joined_at')
    list_filter = ('role', 'joined_at')
    search_fields = ('group__name', 'user__username')

@admin.register(Call)
class CallAdmin(admin.ModelAdmin):
    list_display = ('id', 'caller', 'receiver', 'is_video', 'status', 'duration', 'timestamp')
    list_filter = ('is_video', 'status', 'timestamp')
    search_fields = ('caller__username', 'receiver__username')

@admin.register(Status)
class StatusAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'content', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'content')

@admin.register(StatusView)
class StatusViewAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'viewer', 'viewed_at')
    list_filter = ('viewed_at',)
    search_fields = ('viewer__username',)
