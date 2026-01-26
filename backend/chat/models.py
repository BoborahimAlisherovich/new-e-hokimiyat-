from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class DirectMessage(models.Model):
    """
    Direct message between two users.
    """
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_direct_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_direct_messages')
    content = models.TextField()
    attachment = models.FileField(upload_to='direct_messages/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.sender} -> {self.recipient}: {self.content[:50]}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])


class ChatConversation(models.Model):
    """
    Represents a conversation between two users.
    """
    participant1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_p1')
    participant2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_p2')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message = models.ForeignKey(
        DirectMessage, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='conversation'
    )

    class Meta:
        unique_together = [
            ['participant1', 'participant2']
        ]
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation: {self.participant1} <-> {self.participant2}"

    @classmethod
    def get_or_create_conversation(cls, user1, user2):
        """Get or create a conversation between two users."""
        if user1.id > user2.id:
            user1, user2 = user2, user1
        conversation, _ = cls.objects.get_or_create(
            participant1=user1,
            participant2=user2
        )
        return conversation

    def get_other_participant(self, user):
        """Get the other participant in the conversation."""
        if self.participant1 == user:
            return self.participant2
        return self.participant1
