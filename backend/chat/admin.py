from django.contrib import admin
from .models import DirectMessage, ChatConversation
from django.db.models import Count, Q


@admin.register(DirectMessage)
class DirectMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'recipient', 'content_preview', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at', 'sender__role']
    search_fields = ['content', 'sender__first_name', 'sender__last_name', 'recipient__first_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    list_per_page = 20
    
    fieldsets = (
        ("Xabar ma'lumotlari", {
            "fields": ('sender', 'recipient', 'content', 'file')
        }),
        ("Holati", {
            "fields": ('is_read', 'read_at')
        }),
        ("Vaqt", {
            "fields": ('created_at', 'updated_at'),
            "classes": ('collapse',)
        }),
    )

    @admin.display(description='Xabar mazmuni')
    def content_preview(self, obj):
        preview = obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
        return preview or "(Fayl)"


class MessageInline(admin.TabularInline):
    model = DirectMessage
    fk_name = "conversation"  # We might need to adjust models if this relation doesn't exist directly or use a trick
    # Notes: Usually one-to-many isn't simple here because messages point to users, not conversation ID directly in some schemas.
    # If ChatConversation is just a cache, we might skip inline. 
    # Let's inspect models first, but for now I'll just keep the main Conversation list clean.
    extra = 0
    readonly_fields = ['sender', 'content', 'created_at']
    can_delete = False
    max_num = 0


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ['get_participants', 'last_message_preview', 'updated_at']
    list_filter = ['updated_at']
    search_fields = ['participant1__first_name', 'participant2__first_name']
    readonly_fields = ['created_at', 'updated_at']
    
    @admin.display(description="Suhbatdoshlar")
    def get_participants(self, obj):
        return f"{obj.participant1} <-> {obj.participant2}"

    @admin.display(description="So'nggi xabar")
    def last_message_preview(self, obj):
        last_msg = DirectMessage.objects.filter(
            (Q(sender=obj.participant1) & Q(recipient=obj.participant2)) |
            (Q(sender=obj.participant2) & Q(recipient=obj.participant1))
        ).order_by('-created_at').first()
        return last_msg.content[:30] + '...' if last_msg and last_msg.content else "..."


