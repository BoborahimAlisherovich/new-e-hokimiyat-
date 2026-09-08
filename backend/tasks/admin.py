"""
Task admin configuration.
"""

from django.contrib import admin
from .models import (
    Task, TaskOrganization, TaskExecution, 
    TaskAttachment, TaskMessage, DeadlineExtensionRequest
)


class TaskOrganizationInline(admin.TabularInline):
    model = TaskOrganization
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'priority', 'status', 'deadline', 'created_by', 'created_at']
    list_filter = ['status', 'priority', 'category']
    search_fields = ['title', 'description']
    ordering = ['-created_at']
    inlines = [TaskOrganizationInline]


@admin.register(TaskOrganization)
class TaskOrganizationAdmin(admin.ModelAdmin):
    list_display = ['task', 'organization', 'status', 'assigned_to', 'accepted_at']
    list_filter = ['status', 'organization']


@admin.register(TaskExecution)
class TaskExecutionAdmin(admin.ModelAdmin):
    list_display = ['task', 'executed_by', 'action_type', 'created_at']
    list_filter = ['action_type', 'created_at']


@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'task', 'file_type', 'uploaded_by', 'created_at']
    list_filter = ['file_type']


@admin.register(TaskMessage)
class TaskMessageAdmin(admin.ModelAdmin):
    list_display = ['task', 'sender', 'message_type', 'is_read', 'created_at']
    list_filter = ['message_type', 'is_read']


@admin.register(DeadlineExtensionRequest)
class DeadlineExtensionRequestAdmin(admin.ModelAdmin):
    list_display = ['task', 'requested_by', 'status', 'current_deadline', 'requested_deadline']
    list_filter = ['status']
