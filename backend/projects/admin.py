from django.contrib import admin

from .models import Project, ProjectAttachment, ProjectComment, ProjectHistory


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'status', 'progress', 'budget', 'is_active']
    list_filter = ['category', 'status', 'is_active']
    search_fields = ['title', 'summary', 'owner']
    ordering = ['category', 'sort_order', '-created_at']


@admin.register(ProjectHistory)
class ProjectHistoryAdmin(admin.ModelAdmin):
    list_display = ['project', 'action_type', 'title', 'actor', 'created_at']
    list_filter = ['action_type', 'created_at']
    search_fields = ['project__title', 'title', 'description', 'actor__first_name', 'actor__last_name']


@admin.register(ProjectAttachment)
class ProjectAttachmentAdmin(admin.ModelAdmin):
    list_display = ['project', 'file_name', 'uploaded_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['project__title', 'file_name']


@admin.register(ProjectComment)
class ProjectCommentAdmin(admin.ModelAdmin):
    list_display = ['project', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['project__title', 'message', 'author__first_name', 'author__last_name']
