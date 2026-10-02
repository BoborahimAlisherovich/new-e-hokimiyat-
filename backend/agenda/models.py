"""
KALENDAR (AGENDA) MODELLARI
===========================

Nega alohida ilova:
  Kalendar ikki xil manbani birlashtiradi — TOPSHIRIQ MUDDATLARI (bazada
  saqlanmaydi, `tasks.Task.deadline` dan hisoblanadi) va QO'LDA QO'YILGAN
  ESLATMALAR (shu yerda saqlanadi). Ikkinchisini `tasks` ilovasiga tiqish
  noto'g'ri bo'lardi: eslatma topshiriqqa bog'liq bo'lmasligi ham mumkin
  (yig'ilish, tadbir, shaxsiy belgi). Kelajakda bu ilovaga navbatchilik
  jadvali, bayramlar va tashqi kalendar (ICS) import qilish qo'shiladi.

Nega ilova nomi `calendar` EMAS:
  Python standart kutubxonasida `calendar` moduli bor. Django ilovasini
  shunday nomlash `import calendar` ni sindiradi va xatoni topish juda
  qiyin bo'ladi. Shuning uchun `agenda`.
"""

from datetime import timedelta

from django.db import models

from core.models import BaseModel


class EventKind:
    """Kalendar yozuvining turi."""

    ESLATMA = 'ESLATMA'
    YIGILISH = 'YIGILISH'
    TADBIR = 'TADBIR'
    QABUL = 'QABUL'
    BOSHQA = 'BOSHQA'

    CHOICES = [
        (ESLATMA, 'Eslatma'),
        (YIGILISH, "Yig'ilish"),
        (TADBIR, 'Tadbir'),
        (QABUL, 'Fuqarolar qabuli'),
        (BOSHQA, 'Boshqa'),
    ]


class EventVisibility:
    """Yozuvni kim ko'radi."""

    PRIVATE = 'PRIVATE'
    ORGANIZATION = 'ORGANIZATION'
    EVERYONE = 'EVERYONE'

    CHOICES = [
        (PRIVATE, "Faqat o'zim"),
        (ORGANIZATION, 'Tashkilotim'),
        (EVERYONE, 'Hamma xodimlar'),
    ]


class CalendarEvent(BaseModel):
    """
    Qo'lda qo'yilgan kalendar yozuvi (eslatma, yig'ilish, tadbir).

    Topshiriq muddatlari BU YERDA SAQLANMAYDI — ular `tasks.Task` dan
    o'qiladi va API javobida qo'shib beriladi. Aks holda muddat
    uzaytirilganda ikkita manba bir-biriga mos kelmay qolardi.
    """

    owner = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='calendar_events',
        verbose_name='Egasi',
    )

    title = models.CharField(max_length=300, verbose_name='Sarlavha')
    description = models.TextField(blank=True, default='', verbose_name='Tavsif')
    location = models.CharField(max_length=300, blank=True, default='', verbose_name='Joy')

    kind = models.CharField(
        max_length=20,
        choices=EventKind.CHOICES,
        default=EventKind.ESLATMA,
        verbose_name='Turi',
    )

    start_at = models.DateTimeField(verbose_name='Boshlanish')
    end_at = models.DateTimeField(null=True, blank=True, verbose_name='Tugash')
    all_day = models.BooleanField(default=False, verbose_name='Kun bo\'yi')

    visibility = models.CharField(
        max_length=20,
        choices=EventVisibility.CHOICES,
        default=EventVisibility.PRIVATE,
        verbose_name="Ko'rinishi",
    )

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='calendar_events',
        verbose_name='Tashkilot',
    )

    participants = models.ManyToManyField(
        'users.User',
        blank=True,
        related_name='shared_calendar_events',
        verbose_name='Ishtirokchilar',
    )

    related_task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='calendar_events',
        verbose_name="Bog'liq topshiriq",
    )

    # 0 — eslatma yuborilmaydi
    remind_before_minutes = models.PositiveIntegerField(
        default=60,
        verbose_name='Necha daqiqa oldin eslatilsin',
    )
    reminded_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Eslatma yuborilgan vaqt',
    )

    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_calendar_events',
        verbose_name='Yaratgan',
    )

    class Meta:
        verbose_name = 'Kalendar yozuvi'
        verbose_name_plural = 'Kalendar yozuvlari'
        ordering = ['start_at']
        indexes = [
            # Kalendar HAR DOIM oralig'i bo'yicha so'raladi (oy ko'rinishi),
            # shuning uchun (egasi, boshlanish) juftligi bo'yicha indeks.
            models.Index(fields=['owner', 'start_at'], name='agenda_owner_start_idx'),
            models.Index(fields=['start_at'], name='agenda_start_idx'),
            models.Index(fields=['visibility', 'start_at'], name='agenda_vis_start_idx'),
        ]

    def __str__(self):
        return f"{self.title} — {self.start_at:%d.%m.%Y %H:%M}"

    @property
    def reminder_due_at(self):
        """Eslatma yuborilishi kerak bo'lgan vaqt (yoki None)."""
        if not self.remind_before_minutes:
            return None
        return self.start_at - timedelta(minutes=self.remind_before_minutes)


class TaskDeadlineNotice(BaseModel):
    """
    MUDDAT ESLATMASI YUBORILGANINING BELGISI — takrorlanishni oldini oladi.

    Muammo: Celery beat qayta ishga tushsa, worker vazifani qayta bajarsa
    yoki ikkita worker parallel ishlasa, bir xil «3 kun qoldi» xabari
    bir necha marta ketardi. Hokimga kuniga o'n xil takror bildirishnoma
    kelsa, u butun tizimni o'chirib qo'yadi.

    Yechim: har bir (topshiriq-tashkilot, tur, qolgan kun, muddat
    surati) uchun BITTA yozuv. Baza darajasidagi unique cheklov —
    ya'ni parallel worker ham ikkinchi marta yubora olmaydi.

    `deadline_snapshot` uniqueness'ga ataylab kiritilgan: muddat
    uzaytirilsa, yangi muddat bo'yicha eslatmalar QAYTA yuborilishi
    kerak — aks holda uzaytirilgan topshiriq jimgina unutilardi.
    """

    KIND_REMINDER = 'REMINDER'
    KIND_OVERDUE = 'OVERDUE'
    KIND_CHOICES = [
        (KIND_REMINDER, 'Muddat eslatmasi'),
        (KIND_OVERDUE, "Muddat o'tgani haqida"),
    ]

    task_organization = models.ForeignKey(
        'tasks.TaskOrganization',
        on_delete=models.CASCADE,
        related_name='deadline_notices',
        verbose_name='Topshiriq — tashkilot',
    )
    kind = models.CharField(max_length=16, choices=KIND_CHOICES, verbose_name='Turi')

    # 3, 2, 1, 0 — qolgan kunlar; -1 — muddat o'tgan
    days_left = models.SmallIntegerField(verbose_name='Qolgan kun')

    deadline_snapshot = models.DateTimeField(verbose_name='O\'sha paytdagi muddat')
    recipients_count = models.PositiveIntegerField(default=0, verbose_name='Qabul qiluvchilar')

    class Meta:
        verbose_name = 'Muddat eslatmasi belgisi'
        verbose_name_plural = 'Muddat eslatmasi belgilari'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['task_organization', 'kind', 'days_left', 'deadline_snapshot'],
                name='agenda_deadline_notice_once',
            ),
        ]
        indexes = [
            models.Index(fields=['task_organization', 'kind'], name='agenda_notice_to_kind_idx'),
        ]

    def __str__(self):
        return f"{self.task_organization_id} · {self.kind} · {self.days_left}"
