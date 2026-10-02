from django.contrib import admin

from agenda.models import CalendarEvent, TaskDeadlineNotice


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'kind', 'start_at', 'owner', 'visibility')
    list_filter = ('kind', 'visibility', 'all_day')
    search_fields = ('title', 'description', 'location')
    date_hierarchy = 'start_at'
    autocomplete_fields = ()
    raw_id_fields = ('owner', 'organization', 'related_task', 'created_by')


@admin.register(TaskDeadlineNotice)
class TaskDeadlineNoticeAdmin(admin.ModelAdmin):
    list_display = ('task_organization', 'kind', 'days_left', 'recipients_count', 'created_at')
    list_filter = ('kind', 'days_left')
    raw_id_fields = ('task_organization',)
