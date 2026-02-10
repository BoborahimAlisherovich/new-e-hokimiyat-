"""
Task models for E-Hokimiyat platform.

Task Lifecycle:
- YANGI: New task, just created
- IJRODA: In progress, being executed
- BAJARILDI: Completed, waiting for review
- QAYTA_IJROGA_YUBORILDI: Sent back for re-execution
- MUDDATI_KECH: Overdue
- BAJARILMADI: Failed (auto-set after overdue period)
- NAZORATDAN_YECHILDI: Closed by Hokim (final status)
"""

from django.db import models
from django.utils import timezone
from core.models import BaseModel


class Task(BaseModel):
    """
    Main Task model.
    
    A task can be assigned to multiple organizations.
    Each organization has its own execution status (TaskOrganization).
    """
    
    STATUS_CHOICES = [
        ('YANGI', 'Yangi'),
        ('IJRODA', 'Ijroda'),
        ('BAJARILDI', 'Bajarildi'),
        ('QAYTA_IJROGA_YUBORILDI', "Qayta ijroga yuborildi"),
        ('MUDDATI_KECH', "Muddati kechikkan"),
        ('BAJARILMADI', 'Bajarilmadi'),
        ('NAZORATDAN_YECHILDI', 'Nazoratdan yechildi'),
    ]
    
    PRIORITY_CHOICES = [
        ('PAST', "Muhim emas va shoshilinch emas"),      # 7 kun
        ('ODDIY', "Shoshilinch, lekin muhim emas"),      # 5 kun
        ('YUQORI', "Muhim, lekin shoshilinch emas"),     # 3 kun
        ('FAVQULODDA', "Muhim va shoshilinch"),          # 1 kun
    ]
    
    # Basic info
    title = models.CharField(max_length=500, verbose_name='Sarlavha')
    description = models.TextField(verbose_name='Tavsif')
    
    # Classification
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='ODDIY',
        verbose_name='Ustuvorlik'
    )
    category = models.CharField(max_length=100, blank=True, verbose_name='Kategoriya')
    
    # Status
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='YANGI',
        verbose_name='Holat'
    )
    
    # Dates
    deadline = models.DateTimeField(verbose_name='Muddat')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Bajarilgan vaqt')
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name='Yopilgan vaqt')
    
    # Location (optional, for geo-referenced tasks)
    latitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='Kenglik'
    )
    longitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='Uzunlik'
    )
    address = models.TextField(blank=True, verbose_name='Manzil')
    
    # Created by (Hokim or Hokimlik mas'uli)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='created_tasks',
        verbose_name='Yaratuvchi'
    )
    
    # Closed by (only Hokim)
    closed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_tasks',
        verbose_name='Yopgan'
    )
    
    # Manba (qayerdan yaratilgan)
    SOURCE_CHOICES = [
        ('MANUAL', 'Qo\'lda yaratilgan'),
        ('RECURRING', 'Takrorlanuvchi'),
        ('AI', 'AI tomonidan'),
        ('TELEGRAM', 'Telegram bot'),
    ]
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='MANUAL',
        verbose_name='Manba'
    )
    
    # Takrorlanuvchi topshiriq bog'lanishi
    recurring_task = models.ForeignKey(
        'tasks.RecurringTask',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tasks',
        verbose_name='Takrorlanuvchi topshiriq'
    )
    
    class Meta:
        verbose_name = 'Topshiriq'
        verbose_name_plural = 'Topshiriqlar'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title[:50]
    
    @property
    def is_overdue(self):
        """Check if task is overdue."""
        if self.status in ['NAZORATDAN_YECHILDI', 'BAJARILDI']:
            return False
        return timezone.now() > self.deadline
    
    @property
    def days_remaining(self):
        """Return days until deadline (negative if overdue)."""
        delta = self.deadline - timezone.now()
        return delta.days
    
    @property
    def organization_statuses(self):
        """Return dict of organization statuses."""
        return {
            ta.organization.id: ta.status 
            for ta in self.assigned_organizations.all()
        }
    
    def close(self, user):
        """Close task (only Hokim can do this)."""
        self.status = 'NAZORATDAN_YECHILDI'
        self.closed_by = user
        self.closed_at = timezone.now()
        self.save()
    
    def reassign(self):
        """Send task back for re-execution."""
        self.status = 'QAYTA_IJROGA_YUBORILDI'
        self.save()


class TaskOrganization(BaseModel):
    """
    Task assignment to organization.
    
    Each organization has its own status for a task.
    This allows tracking individual organization progress.
    """
    
    STATUS_CHOICES = [
        ('YANGI', 'Yangi'),
        ('IJRODA', 'Ijroda'),
        ('BAJARILDI', 'Bajarildi'),
        ('QAYTA_IJROGA_YUBORILDI', "Qayta ijroga yuborildi"),
        ('MUDDATI_KECH', "Muddati kechikkan"),
        ('BAJARILMADI', 'Bajarilmadi'),
        ('NAZORATDAN_YECHILDI', 'Nazoratdan yechildi'),
    ]
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='assigned_organizations',
        verbose_name='Topshiriq'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='task_assignments',
        verbose_name='Tashkilot'
    )
    
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='YANGI',
        verbose_name='Holat'
    )
    
    # Assigned executor within organization
    assigned_to = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        verbose_name='Ijrochi'
    )
    
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name='Qabul qilingan vaqt')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Bajarilgan vaqt')
    
    class Meta:
        verbose_name = 'Topshiriq biriktirilishi'
        verbose_name_plural = 'Topshiriq biriktirilishlari'
        unique_together = ['task', 'organization']
    
    def __str__(self):
        return f"{self.task.title[:30]} -> {self.organization.name}"
    
    def accept(self, user):
        """Accept task for execution."""
        self.status = 'IJRODA'
        self.assigned_to = user
        self.accepted_at = timezone.now()
        self.save()
    
    def complete(self):
        """Mark as completed."""
        self.status = 'BAJARILDI'
        self.completed_at = timezone.now()
        self.save()


class TaskExecution(BaseModel):
    """
    Task execution journal.
    
    Tracks all actions taken on a task.
    This is critical for audit, legal proceedings, and accountability.
    """
    
    ACTION_CHOICES = [
        ('IJROGA_OLINDI', 'Ijroga olindi'),
        ('HISOBOT_TOPSHIRILDI', 'Hisobot topshirildi'),
        ('QAYTA_YUBORILDI', 'Qayta yuborildi'),
        ('NAZORATDAN_YECHILDI', 'Nazoratdan yechildi'),
        ('MUDDAT_UZAYTIRISH_SOROVI', "Muddat uzaytirish so'rovi"),
        ('MUDDAT_UZAYTIRILDI', 'Muddat uzaytirildi'),
        ('IZOH_QOSHILDI', "Izoh qo'shildi"),
        ('FAYL_YUKLANDI', 'Fayl yuklandi'),
    ]
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='executions',
        verbose_name='Topshiriq'
    )
    task_organization = models.ForeignKey(
        TaskOrganization,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='executions',
        verbose_name='Tashkilot biriktirilishi'
    )
    
    executed_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='task_executions',
        verbose_name='Bajaruvchi'
    )
    
    action_type = models.CharField(
        max_length=30,
        choices=ACTION_CHOICES,
        verbose_name='Amal turi'
    )
    
    comment = models.TextField(blank=True, verbose_name='Izoh')
    
    # Status change tracking
    old_status = models.CharField(max_length=30, blank=True, verbose_name='Eski holat')
    new_status = models.CharField(max_length=30, blank=True, verbose_name='Yangi holat')
    
    class Meta:
        verbose_name = 'Topshiriq ijrosi'
        verbose_name_plural = 'Topshiriq ijrolari'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.task.title[:20]} - {self.get_action_type_display()}"


class TaskAttachment(BaseModel):
    """
    File attachments for tasks.
    """
    
    FILE_TYPE_CHOICES = [
        ('DOCUMENT', 'Hujjat'),
        ('IMAGE', 'Rasm'),
        ('AUDIO', 'Audio'),
        ('VIDEO', 'Video'),
        ('OTHER', 'Boshqa'),
    ]
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Topshiriq'
    )
    execution = models.ForeignKey(
        TaskExecution,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments',
        verbose_name='Ijro'
    )
    
    uploaded_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_attachments',
        verbose_name='Yuklagan'
    )
    
    file = models.FileField(upload_to='task_attachments/%Y/%m/', verbose_name='Fayl')
    file_name = models.CharField(max_length=255, verbose_name='Fayl nomi')
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        default='DOCUMENT',
        verbose_name='Fayl turi'
    )
    file_size = models.PositiveIntegerField(default=0, verbose_name='Fayl hajmi (bayt)')
    
    class Meta:
        verbose_name = 'Topshiriq ilovasi'
        verbose_name_plural = 'Topshiriq ilovalari'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.file_name


class TaskMessage(BaseModel):
    """
    Chat messages within task timeline.
    
    This is part of the unified timeline (chat + execution = one timeline).
    """
    
    MESSAGE_TYPE_CHOICES = [
        ('TEXT', 'Matn'),
        ('FILE', 'Fayl'),
        ('AUDIO', 'Audio'),
        ('SYSTEM', 'Tizim xabari'),
    ]
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Topshiriq'
    )
    
    sender = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_task_messages',
        verbose_name='Yuboruvchi'
    )
    
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        default='TEXT',
        verbose_name='Xabar turi'
    )
    
    content = models.TextField(verbose_name='Mazmun')
    
    # For file/audio messages
    attachment = models.ForeignKey(
        TaskAttachment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='messages',
        verbose_name='Ilova'
    )
    
    is_read = models.BooleanField(default=False, verbose_name="O'qilgan")
    
    class Meta:
        verbose_name = 'Topshiriq xabari'
        verbose_name_plural = 'Topshiriq xabarlari'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender}: {self.content[:30]}"


class DeadlineExtensionRequest(BaseModel):
    """
    Request to extend task deadline.
    
    Can be requested by: Tashkilot rahbari, Tashkilot mas'uli
    Can be approved by: Only Hokim
    """
    
    STATUS_CHOICES = [
        ('KUTILMOQDA', 'Kutilmoqda'),
        ('TASDIQLANDI', 'Tasdiqlandi'),
        ('RAD_ETILDI', 'Rad etildi'),
    ]
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='extension_requests',
        verbose_name='Topshiriq'
    )
    task_organization = models.ForeignKey(
        TaskOrganization,
        on_delete=models.CASCADE,
        related_name='extension_requests',
        verbose_name='Tashkilot biriktirilishi'
    )
    
    requested_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='extension_requests',
        verbose_name="So'rov yuborgan"
    )
    
    current_deadline = models.DateTimeField(verbose_name='Hozirgi muddat')
    requested_deadline = models.DateTimeField(verbose_name="So'ralgan muddat")
    reason = models.TextField(verbose_name='Sabab')
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='KUTILMOQDA',
        verbose_name='Holat'
    )
    
    reviewed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_extensions',
        verbose_name="Ko'rib chiqqan"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name="Ko'rib chiqilgan vaqt")
    review_comment = models.TextField(blank=True, verbose_name="Ko'rib chiqish izohi")
    
    class Meta:
        verbose_name = "Muddat uzaytirish so'rovi"
        verbose_name_plural = "Muddat uzaytirish so'rovlari"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.task.title[:30]} - {self.get_status_display()}"
    
    def approve(self, user, comment=''):
        """Approve extension request."""
        self.status = 'TASDIQLANDI'
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.review_comment = comment
        self.save()
        
        # Update task deadline
        self.task.deadline = self.requested_deadline
        self.task.save()
    
    def reject(self, user, comment=''):
        """Reject extension request."""
        self.status = 'RAD_ETILDI'
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.review_comment = comment
        self.save()


# ==============================================================================
# TAKRORLANUVCHI TOPSHIRIQLAR
# ==============================================================================

class RecurringTask(BaseModel):
    """
    Takrorlanuvchi topshiriq shabloni.
    
    Bu model asosida belgilangan vaqtda avtomatik topshiriqlar yaratiladi.
    """
    
    FREQUENCY_CHOICES = [
        ('DAILY', 'Har kuni'),
        ('WEEKLY', 'Har hafta'),
        ('BIWEEKLY', 'Ikki haftada bir'),
        ('MONTHLY', 'Har oy'),
        ('QUARTERLY', 'Har chorakda'),
        ('YEARLY', 'Har yili'),
        ('CUSTOM', 'Maxsus (cron)'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Faol'),
        ('PAUSED', "To'xtatilgan"),
        ('COMPLETED', 'Yakunlangan'),
        ('CANCELLED', 'Bekor qilingan'),
    ]
    
    # Asosiy ma'lumotlar
    title = models.CharField(max_length=500, verbose_name='Topshiriq sarlavhasi')
    description = models.TextField(verbose_name='Topshiriq tavsifi')
    
    # Takrorlanish sozlamalari
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='MONTHLY',
        verbose_name='Takrorlanish chastotasi'
    )
    cron_expression = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='Cron ifodasi',
        help_text="Maxsus takrorlanish uchun cron formati"
    )
    cron_description = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name='Cron tavsifi'
    )
    
    # Vaqt sozlamalari
    start_date = models.DateField(verbose_name='Boshlanish sanasi')
    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Tugash sanasi'
    )
    next_run_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Keyingi ishga tushish'
    )
    last_run_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Oxirgi ishga tushish'
    )
    
    # Topshiriq sozlamalari
    priority = models.CharField(
        max_length=20,
        choices=Task.PRIORITY_CHOICES,
        default='ODDIY',
        verbose_name='Muhimlik darajasi'
    )
    category = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='Kategoriya'
    )
    deadline_days = models.PositiveIntegerField(
        default=7,
        verbose_name='Muddat (kun)'
    )
    
    # Tashkilotlar
    organizations = models.ManyToManyField(
        'organizations.Organization',
        related_name='recurring_tasks',
        verbose_name='Tayinlangan tashkilotlar',
        blank=True
    )
    
    # Yaratuvchi va holat
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_recurring_tasks',
        verbose_name='Yaratuvchi'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE',
        verbose_name='Holat'
    )
    
    # Statistika
    total_created = models.PositiveIntegerField(default=0, verbose_name='Jami yaratilgan')
    
    class Meta:
        verbose_name = "Takrorlanuvchi topshiriq"
        verbose_name_plural = "Takrorlanuvchi topshiriqlar"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"[{self.get_frequency_display()}] {self.title[:50]}"
    
    def calculate_next_run(self):
        """Keyingi ishga tushish vaqtini hisoblash"""
        from datetime import timedelta
        
        now = timezone.now()
        
        if self.frequency == 'CUSTOM' and self.cron_expression:
            try:
                from croniter import croniter
                cron = croniter(self.cron_expression, now)
                self.next_run_date = cron.get_next(timezone.datetime)
            except Exception:
                self.next_run_date = now + timedelta(days=1)
        else:
            base_date = self.last_run_date or now
            
            intervals = {
                'DAILY': timedelta(days=1),
                'WEEKLY': timedelta(weeks=1),
                'BIWEEKLY': timedelta(weeks=2),
                'MONTHLY': timedelta(days=30),
                'QUARTERLY': timedelta(days=90),
                'YEARLY': timedelta(days=365),
            }
            self.next_run_date = base_date + intervals.get(self.frequency, timedelta(days=1))
        
        self.save()
    
    def create_task_instance(self):
        """Yangi topshiriq nusxasini yaratish"""
        from datetime import timedelta
        
        if self.status != 'ACTIVE':
            return None
        
        # Tugash sanasini tekshirish
        if self.end_date and timezone.now().date() > self.end_date:
            self.status = 'COMPLETED'
            self.save()
            return None
        
        # Yangi topshiriq yaratish
        task = Task.objects.create(
            title=f"{self.title} - {timezone.now().strftime('%d.%m.%Y')}",
            description=self.description,
            priority=self.priority,
            category=self.category,
            deadline=timezone.now() + timedelta(days=self.deadline_days),
            created_by=self.created_by,
            source='RECURRING',
            recurring_task=self,
        )
        
        # Tashkilotlarni qo'shish
        for org in self.organizations.all():
            TaskOrganization.objects.create(task=task, organization=org)
        
        # Tarix yozish
        RecurringTaskHistory.objects.create(
            recurring_task=self,
            created_task=task,
            scheduled_date=timezone.now()
        )
        
        # Statistikani yangilash
        self.last_run_date = timezone.now()
        self.total_created += 1
        self.save()
        self.calculate_next_run()
        
        return task


class RecurringTaskHistory(BaseModel):
    """Takrorlanuvchi topshiriq tarixi"""
    
    recurring_task = models.ForeignKey(
        RecurringTask,
        on_delete=models.CASCADE,
        related_name='history',
        verbose_name='Takrorlanuvchi topshiriq'
    )
    created_task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='recurring_source',
        verbose_name='Yaratilgan topshiriq'
    )
    scheduled_date = models.DateTimeField(verbose_name='Rejalashtirilgan sana')
    
    class Meta:
        verbose_name = "Takrorlanuvchi topshiriq tarixi"
        verbose_name_plural = "Takrorlanuvchi topshiriq tarixlari"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.recurring_task.title[:30]} -> #{self.created_task.id}"
