from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
import uuid

User = get_user_model()


class BotSettings(models.Model):
    """Telegram bot sozlamalari - saytdan boshqariladi"""
    
    bot_token = models.CharField(
        max_length=100, 
        verbose_name="Bot Token",
        help_text="Telegram BotFather'dan olingan token"
    )
    bot_username = models.CharField(
        max_length=100, 
        blank=True, 
        verbose_name="Bot username"
    )
    is_active = models.BooleanField(
        default=False, 
        verbose_name="Bot faolmi"
    )
    webhook_url = models.URLField(
        blank=True, 
        null=True,
        verbose_name="Webhook URL"
    )
    use_webhook = models.BooleanField(
        default=False,
        verbose_name="Webhook ishlatish"
    )
    
    # AI sozlamalari
    ai_provider = models.CharField(
        max_length=20,
        choices=[
            ('openai', 'OpenAI (GPT)'),
            ('anthropic', 'Anthropic (Claude)'),
            ('disabled', "O'chirilgan"),
        ],
        default='disabled',
        verbose_name="AI provayder"
    )
    ai_api_key = models.CharField(
        max_length=200, 
        blank=True,
        verbose_name="AI API kaliti"
    )
    ai_model = models.CharField(
        max_length=50,
        default='gpt-4o-mini',
        verbose_name="AI modeli"
    )
    
    # Auto-response sozlamalari
    auto_response_enabled = models.BooleanField(
        default=True,
        verbose_name="AI avtomatik javob",
        help_text="Admin javob bermasa AI avtomatik javob beradi"
    )
    auto_response_timeout_minutes = models.PositiveIntegerField(
        default=5,
        verbose_name="Kutish vaqti (daqiqa)",
        help_text="Admin javob berish uchun kutish vaqti (daqiqada). O'tgandan so'ng AI javob beradi."
    )
    
    # Xabar shablonlari
    welcome_message_uz = models.TextField(
        default="🏛 Xatirchi hokimligiga xush kelibsiz!\n\nBu bot orqali siz murojaatlaringizni yuborishingiz mumkin.",
        verbose_name="Salomlashish xabari (O'zbekcha)"
    )
    welcome_message_ru = models.TextField(
        default="🏛 Добро пожаловать в хокимият Хатырчи!\n\nЧерез этого бота вы можете отправлять свои обращения.",
        verbose_name="Salomlashish xabari (Ruscha)"
    )
    welcome_message_en = models.TextField(
        default="🏛 Welcome to Hatirchi Hokimiyat!\n\nYou can send your appeals through this bot.",
        verbose_name="Salomlashish xabari (Inglizcha)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Bot sozlamalari"
        verbose_name_plural = "Bot sozlamalari"
    
    def __str__(self):
        return f"Bot: {self.bot_username or 'Sozlanmagan'}"
    
    def save(self, *args, **kwargs):
        # Faqat bitta sozlama bo'lishi kerak
        if not self.pk and BotSettings.objects.exists():
            existing = BotSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)


class BotAdmin(models.Model):
    """Bot administratorlari - Telegram ID orqali"""
    
    telegram_id = models.BigIntegerField(
        unique=True,
        verbose_name="Telegram ID"
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='bot_admin_profiles',
        verbose_name="Tizim foydalanuvchisi"
    )
    username = models.CharField(
        max_length=100, 
        blank=True,
        verbose_name="Telegram username"
    )
    full_name = models.CharField(
        max_length=200, 
        blank=True,
        verbose_name="To'liq ism"
    )
    is_super_admin = models.BooleanField(
        default=False,
        verbose_name="Super admin"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Faol"
    )
    can_approve_appeals = models.BooleanField(
        default=True,
        verbose_name="Murojaatlarni tasdiqlash"
    )
    can_respond_appeals = models.BooleanField(
        default=True,
        verbose_name="Murojaatlarga javob berish"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Bot admin"
        verbose_name_plural = "Bot adminlar"
    
    def __str__(self):
        return f"Admin: {self.full_name or self.telegram_id}"


class BotRegion(models.Model):
    """Hatirchi tumani qishloqlari"""
    
    name_uz = models.CharField(max_length=100, verbose_name="Nomi (O'zbekcha)")
    name_ru = models.CharField(max_length=100, blank=True, verbose_name="Nomi (Ruscha)")
    name_en = models.CharField(max_length=100, blank=True, verbose_name="Nomi (Inglizcha)")
    code = models.CharField(max_length=20, unique=True, verbose_name="Kod")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib")
    
    class Meta:
        verbose_name = "Hudud"
        verbose_name_plural = "Hududlar"
        ordering = ['order', 'name_uz']
    
    def __str__(self):
        return self.name_uz


class TelegramUser(models.Model):
    """Telegram orqali ro'yxatdan o'tgan foydalanuvchilar"""
    
    GENDER_CHOICES = [
        ('male', 'Erkak'),
        ('female', 'Ayol'),
    ]
    
    LANGUAGE_CHOICES = [
        ('uz', "O'zbekcha"),
        ('ru', 'Русский'),
        ('en', 'English'),
    ]
    
    telegram_id = models.BigIntegerField(
        unique=True,
        verbose_name="Telegram ID"
    )
    username = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        verbose_name="Telegram username"
    )
    
    # Ro'yxatdan o'tish ma'lumotlari
    first_name = models.CharField(
        max_length=100,
        verbose_name="Ismi"
    )
    last_name = models.CharField(
        max_length=100,
        verbose_name="Familiyasi"
    )
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        verbose_name="Jinsi"
    )
    phone_validator = RegexValidator(
        regex=r'^\+998[0-9]{9}$',
        message="Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak"
    )
    phone = models.CharField(
        max_length=13,
        validators=[phone_validator],
        verbose_name="Telefon raqam"
    )
    region = models.ForeignKey(
        BotRegion,
        on_delete=models.SET_NULL,
        null=True,
        related_name='telegram_users',
        verbose_name="Hudud"
    )
    
    # Til sozlamalari
    language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='uz',
        verbose_name="Til"
    )
    
    # Ro'yxatdan o'tish holati
    is_registered = models.BooleanField(
        default=False,
        verbose_name="Ro'yxatdan o'tgan"
    )
    registration_step = models.CharField(
        max_length=50,
        default='start',
        verbose_name="Ro'yxatdan o'tish bosqichi"
    )
    
    # Tizim foydalanuvchisiga bog'lanish (ixtiyoriy)
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='telegram_profile',
        verbose_name="Tizim foydalanuvchisi"
    )
    
    is_blocked = models.BooleanField(
        default=False,
        verbose_name="Bloklangan"
    )
    block_reason = models.TextField(
        blank=True,
        verbose_name="Bloklash sababi"
    )
    warning_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Ogohlantirish soni"
    )
    last_warning_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Oxirgi ogohlantirish sanasi"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Telegram foydalanuvchi"
        verbose_name_plural = "Telegram foydalanuvchilar"
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.telegram_id})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class AppealCategory(models.Model):
    """Murojaat sohalari"""
    
    name_uz = models.CharField(max_length=100, verbose_name="Nomi (O'zbekcha)")
    name_ru = models.CharField(max_length=100, blank=True, verbose_name="Nomi (Ruscha)")
    name_en = models.CharField(max_length=100, blank=True, verbose_name="Nomi (Inglizcha)")
    code = models.CharField(max_length=50, unique=True, verbose_name="Kod")
    icon = models.CharField(max_length=10, default='📋', verbose_name="Emoji")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib")
    
    class Meta:
        verbose_name = "Murojaat sohasi"
        verbose_name_plural = "Murojaat sohalari"
        ordering = ['order', 'name_uz']
    
    def __str__(self):
        return self.name_uz


class AppealType(models.Model):
    """Murojaat turlari"""
    
    TYPE_CHOICES = [
        ('complaint', 'Shikoyat'),
        ('suggestion', 'Taklif'),
        ('question', 'Savol'),
        ('gratitude', 'Minnatdorchilik'),
        ('other', 'Boshqa'),
    ]
    
    name_uz = models.CharField(max_length=100, verbose_name="Nomi (O'zbekcha)")
    name_ru = models.CharField(max_length=100, blank=True, verbose_name="Nomi (Ruscha)")
    name_en = models.CharField(max_length=100, blank=True, verbose_name="Nomi (Inglizcha)")
    code = models.CharField(max_length=50, unique=True, verbose_name="Kod")
    icon = models.CharField(max_length=10, default='📝', verbose_name="Emoji")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib")
    
    class Meta:
        verbose_name = "Murojaat turi"
        verbose_name_plural = "Murojaat turlari"
        ordering = ['order', 'name_uz']
    
    def __str__(self):
        return self.name_uz


class TelegramAppeal(models.Model):
    """Telegram orqali kelgan murojaatlar"""
    
    STATUS_CHOICES = [
        ('draft', 'Qoralama'),
        ('pending_ai', 'AI tekshiruvida'),
        ('pending_review', 'Admin tekshiruvida'),
        ('approved', 'Tasdiqlangan'),
        ('rejected', 'Rad etilgan'),
        ('responded', 'Javob berilgan'),
        ('forwarded', 'Topshiriq sifatida kiritilgan'),
        ('resolved', 'Hal qilingan'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Past'),
        ('medium', "O'rta"),
        ('high', 'Yuqori'),
        ('urgent', 'Shoshilinch'),
    ]
    
    SOURCE_CHOICES = [
        ('telegram', 'Telegram'),
        ('web', 'Veb-sayt'),
        ('manual', 'Qo\'lda kiritilgan'),
    ]
    
    # Unikal identifikator
    uuid = models.UUIDField(
        default=uuid.uuid4, 
        editable=False, 
        unique=True
    )
    appeal_number = models.CharField(
        max_length=20, 
        unique=True, 
        blank=True,
        verbose_name="Murojaat raqami"
    )
    
    # Murojaat egasi
    telegram_user = models.ForeignKey(
        TelegramUser,
        on_delete=models.CASCADE,
        related_name='appeals',
        verbose_name="Telegram foydalanuvchi"
    )
    
    # Murojaat ma'lumotlari
    appeal_type = models.ForeignKey(
        AppealType,
        on_delete=models.SET_NULL,
        null=True,
        related_name='appeals',
        verbose_name="Murojaat turi"
    )
    category = models.ForeignKey(
        AppealCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name='appeals',
        verbose_name="Murojaat sohasi"
    )
    text = models.TextField(
        verbose_name="Murojaat matni"
    )
    
    # Holat va muhimlik
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="Holat"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name="Muhimlik darajasi"
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='telegram',
        verbose_name="Manba"
    )
    
    # AI tahlili
    ai_analysis = models.TextField(
        blank=True,
        default='',
        verbose_name="AI tahlili"
    )
    ai_score = models.IntegerField(
        default=0,
        verbose_name="AI ball"
    )
    ai_priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        blank=True,
        null=True,
        verbose_name="AI aniqlagan muhimlik"
    )
    ai_category_suggestion = models.ForeignKey(
        AppealCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_suggested_appeals',
        verbose_name="AI taklif qilgan soha"
    )
    ai_response = models.TextField(
        blank=True,
        verbose_name="AI javobi"
    )
    ai_is_valid = models.BooleanField(
        default=True,
        verbose_name="AI: Murojaat to'g'ri"
    )
    ai_rejection_reason = models.TextField(
        blank=True,
        null=True,
        default='',
        verbose_name="AI rad etish sababi"
    )
    
    # Admin javobi
    admin_response = models.TextField(
        blank=True,
        verbose_name="Admin javobi"
    )
    reviewed_by = models.ForeignKey(
        BotAdmin,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_appeals',
        verbose_name="Ko'rib chiqqan admin"
    )
    reviewed_at = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Ko'rib chiqilgan vaqt"
    )
    
    # Admin xabardor qilingan vaqt (auto-response timeout uchun)
    admin_notified_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Adminlarga xabar yuborilgan vaqt"
    )
    ai_auto_responded = models.BooleanField(
        default=False,
        verbose_name="AI avtomatik javob bergan"
    )
    
    # Topshiriq sifatida kiritish
    forwarded_to_site = models.BooleanField(
        default=False,
        verbose_name="Topshiriq sifatida kiritilgan"
    )
    site_appeal_id = models.IntegerField(
        null=True, 
        blank=True,
        verbose_name="Saytdagi murojaat ID"
    )
    site_task_id = models.IntegerField(
        null=True, 
        blank=True,
        verbose_name="Saytdagi topshiriq ID"
    )
    
    # Baholash
    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Baho (1-5)",
        help_text="Foydalanuvchi xizmatni baholashi"
    )
    rating_comment = models.TextField(
        blank=True,
        default='',
        verbose_name="Baho izohi"
    )
    rated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Baholangan vaqt"
    )
    closed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Yopilgan vaqt"
    )
    
    # Vaqtlar
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Telegram murojaat"
        verbose_name_plural = "Telegram murojaatlar"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"#{self.appeal_number} - {self.telegram_user.full_name}"
    
    def save(self, *args, **kwargs):
        if not self.appeal_number:
            import datetime
            today = datetime.date.today()
            prefix = f"TG{today.strftime('%Y%m%d')}"
            last_appeal = TelegramAppeal.objects.filter(
                appeal_number__startswith=prefix
            ).order_by('-appeal_number').first()
            
            if last_appeal:
                last_num = int(last_appeal.appeal_number[-4:])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.appeal_number = f"{prefix}{new_num:04d}"
        
        super().save(*args, **kwargs)


class AppealAttachment(models.Model):
    """Murojaat ilovalari (rasm, video, audio, fayl)"""
    
    FILE_TYPE_CHOICES = [
        ('photo', 'Rasm'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('voice', 'Ovozli xabar'),
        ('document', 'Hujjat'),
        ('video_note', 'Video xabar'),
    ]
    
    appeal = models.ForeignKey(
        TelegramAppeal,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name="Murojaat"
    )
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        verbose_name="Fayl turi"
    )
    telegram_file_id = models.CharField(
        max_length=200,
        verbose_name="Telegram fayl ID"
    )
    file = models.FileField(
        upload_to='appeals/attachments/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="Fayl"
    )
    file_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Fayl nomi"
    )
    file_size = models.PositiveIntegerField(
        default=0,
        verbose_name="Fayl hajmi (bayt)"
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="MIME turi"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Murojaat ilovasi"
        verbose_name_plural = "Murojaat ilovalari"
    
    def __str__(self):
        return f"{self.file_type}: {self.file_name or self.telegram_file_id}"


class AppealMessage(models.Model):
    """Murojaat bo'yicha xabarlar (admin va foydalanuvchi o'rtasida)"""
    
    appeal = models.ForeignKey(
        TelegramAppeal,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name="Murojaat"
    )
    is_from_admin = models.BooleanField(
        default=False,
        verbose_name="Admindan"
    )
    admin = models.ForeignKey(
        BotAdmin,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Admin"
    )
    sender_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appeal_messages',
        verbose_name="Yuboruvchi foydalanuvchi"
    )
    text = models.TextField(
        verbose_name="Xabar matni"
    )
    is_ai_generated = models.BooleanField(
        default=False,
        verbose_name="AI tomonidan yaratilgan"
    )
    telegram_message_id = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name="Telegram xabar ID"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Murojaat xabari"
        verbose_name_plural = "Murojaat xabarlari"
        ordering = ['created_at']
    
    def __str__(self):
        sender = "Admin" if self.is_from_admin else "Foydalanuvchi"
        return f"{sender}: {self.text[:50]}..."


class UserState(models.Model):
    """Foydalanuvchi holati (FSM uchun)"""
    
    telegram_id = models.BigIntegerField(
        unique=True,
        verbose_name="Telegram ID"
    )
    state = models.CharField(
        max_length=100,
        default='start',
        verbose_name="Holat"
    )
    data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Qo'shimcha ma'lumotlar"
    )
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Foydalanuvchi holati"
        verbose_name_plural = "Foydalanuvchi holatlari"
    
    def __str__(self):
        return f"{self.telegram_id}: {self.state}"
