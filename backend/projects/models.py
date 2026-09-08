from django.conf import settings
from django.db import models

from core.models import BaseModel


class Project(BaseModel):
    CATEGORY_CHOICES = [
        ('MAHALLIY', 'Mahalliy loyiha'),
        ('XALQARO', 'Xalqaro loyiha'),
        ('DRIVER', 'Driver loyiha'),
    ]

    STATUS_CHOICES = [
        ('REJA', 'Rejada'),
        ('TASDIQLANGAN', 'Tasdiqlangan'),
        ('IJRODA', 'Ijroda'),
        ('MONITORING', 'Monitoring'),
        ('YAKUNLANGAN', 'Yakunlangan'),
    ]

    title = models.CharField(max_length=255, verbose_name='Nomi')
    summary = models.TextField(blank=True, verbose_name='Qisqa tavsif')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name='Kategoriya')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REJA', verbose_name='Holati')
    progress = models.PositiveSmallIntegerField(default=0, verbose_name='Progress foizi')
    budget = models.CharField(max_length=120, blank=True, verbose_name='Byudjet/qiymat')
    owner = models.CharField(max_length=180, blank=True, verbose_name="Mas'ul bo'lim")
    start_date = models.DateField(null=True, blank=True, verbose_name='Boshlanish sanasi')
    end_date = models.DateField(null=True, blank=True, verbose_name='Yakun sanasi')
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name='Tartib')
    is_active = models.BooleanField(default=True, verbose_name='Faol')

    class Meta:
        verbose_name = 'Loyiha'
        verbose_name_plural = 'Loyihalar'
        ordering = ['category', 'sort_order', '-created_at']

    def __str__(self):
        return self.title


class ProjectHistory(BaseModel):
    ACTION_CHOICES = [
        ('CREATED', 'Yaratildi'),
        ('UPDATED', 'Yangilandi'),
        ('STATUS_CHANGED', "Holati o'zgardi"),
        ('PROGRESS_CHANGED', 'Progress yangilandi'),
        ('DELETED', "O'chirildi"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='history_entries',
        verbose_name='Loyiha',
    )
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES, verbose_name='Amal turi')
    title = models.CharField(max_length=255, verbose_name='Sarlavha')
    description = models.TextField(blank=True, verbose_name='Tavsif')
    metadata = models.JSONField(default=dict, blank=True, verbose_name='Qo‘shimcha ma’lumot')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='project_history_entries',
        verbose_name='Amalni bajargan foydalanuvchi',
    )

    class Meta:
        verbose_name = 'Loyiha tarixi'
        verbose_name_plural = 'Loyiha tarixlari'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.title}: {self.title}"


class ProjectAttachment(BaseModel):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Loyiha',
    )
    file = models.FileField(upload_to='projects/attachments/%Y/%m/', verbose_name='Fayl')
    file_name = models.CharField(max_length=255, blank=True, verbose_name='Fayl nomi')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_project_attachments',
        verbose_name='Yuklagan foydalanuvchi',
    )

    class Meta:
        verbose_name = 'Loyiha fayli'
        verbose_name_plural = 'Loyiha fayllari'
        ordering = ['-created_at']

    def __str__(self):
        return self.file_name or self.file.name

    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)


class ProjectComment(BaseModel):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Loyiha',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='project_comments',
        verbose_name='Muallif',
    )
    message = models.TextField(verbose_name='Xabar')

    class Meta:
        verbose_name = 'Loyiha kommentariyasi'
        verbose_name_plural = 'Loyiha kommentariyalari'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.project.title}: {self.message[:40]}"
