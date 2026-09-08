"""
User models for E-Hokimiyat platform.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from core.models import BaseModel
import uuid


class UserManager(BaseUserManager):
    """
    Custom user manager for login/password authentication.
    """
    
    def create_user(self, login, password=None, **extra_fields):
        pnfl = extra_fields.pop('pnfl', None)
        if not login:
            login = pnfl
        if not login:
            raise ValueError('Login majburiy')
        if not pnfl:
            raise ValueError('PNFL majburiy')
        login = str(login).strip()
        
        user = self.model(login=login, pnfl=pnfl, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, login, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('status', 'FAOL')
        
        return self.create_user(login, password, **extra_fields)


class Role(models.Model):
    """
    Role model for role-based access control.
    """
    ROLE_CHOICES = [
        ('HOKIM', 'Hokim'),
        ('HOKIM_YORDAMCHISI', "Hokim o'rinbosari"),
        ('HOKIMLIK_MASUL', "Hokimlik mutaxassisi"),
        ('TASHKILOT_RAHBARI', 'Tashkilot rahbari'),
        ('TASHKILOT_MASUL', "Tashkilot mas'uli"),
        ('ADMIN', 'Administrator'),
    ]
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Rol'
        verbose_name_plural = 'Rollar'
    
    def __str__(self):
        return self.display_name


class Position(models.Model):
    """Managed list of positions used when creating/editing users."""

    name = models.CharField(max_length=200, unique=True, verbose_name='Lavozim nomi')
    description = models.TextField(blank=True, verbose_name='Tavsif')
    is_active = models.BooleanField(default=True, verbose_name='Faol')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan vaqt')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Yangilangan vaqt')

    class Meta:
        verbose_name = 'Lavozim'
        verbose_name_plural = 'Lavozimlar'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with dedicated login and password authentication.
    
    User Lifecycle:
    - DRAFT: Draft user
    - KUTILMOQDA: Created, but not fully activated yet
    - FAOL: Active user
    - BLOKLANGAN: Temporarily blocked
    - ARXIV: Archived (left the position)
    """
    
    STATUS_CHOICES = [
        ('DRAFT', 'Qoralama'),
        ('KUTILMOQDA', 'Kutilmoqda'),
        ('FAOL', 'Faol'),
        ('BLOKLANGAN', 'Bloklangan'),
        ('ARXIV', 'Arxiv'),
    ]
    
    ROLE_CHOICES = [
        ('HOKIM', 'Hokim'),
        ('HOKIM_YORDAMCHISI', "Hokim o'rinbosari"),
        ('HOKIMLIK_MASUL', "Hokimlik mutaxassisi"),
        ('TASHKILOT_RAHBARI', 'Tashkilot rahbari'),
        ('TASHKILOT_MASUL', "Tashkilot mas'uli"),
        ('ADMIN', 'Administrator'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    login = models.CharField(
        max_length=150,
        unique=True,
        db_index=True,
        verbose_name='Login'
    )

    # PNFL - official identifier (14 digits)
    pnfl = models.CharField(
        max_length=14, 
        unique=True, 
        db_index=True,
        verbose_name='PNFL (JSHSHR)'
    )
    
    # Personal information
    first_name = models.CharField(max_length=100, verbose_name='Ism')
    last_name = models.CharField(max_length=100, verbose_name='Familiya')
    middle_name = models.CharField(max_length=100, blank=True, verbose_name="Otasining ismi")
    
    # Contact
    phone = models.CharField(max_length=20, blank=True, verbose_name='Telefon')
    email = models.EmailField(blank=True, verbose_name='Email')
    
    # Profile picture
    avatar = models.ImageField(
        upload_to='avatars/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='Profil rasmi'
    )
    
    # Role and Organization
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name='Rol')
    sector = models.ForeignKey(
        'organizations.Sector',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name='Soha / kompleks'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name='Tashkilot'
    )
    supervisor = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subordinates',
        verbose_name="Bevosita rahbar"
    )
    position = models.CharField(max_length=200, blank=True, verbose_name='Lavozim')
    visible_password = models.CharField(
        max_length=128,
        blank=True,
        default='',
        verbose_name="Ko'rinadigan parol"
    )
    
    # Status
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='FAOL',
        verbose_name='Holat'
    )
    
    # Tracking
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_users',
        verbose_name="Yaratgan foydalanuvchi"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan vaqt')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Yangilangan vaqt')
    activated_at = models.DateTimeField(null=True, blank=True, verbose_name='Faollashtirilgan vaqt')
    first_login_at = models.DateTimeField(null=True, blank=True, verbose_name='Birinchi kirish vaqti')
    last_seen = models.DateTimeField(null=True, blank=True, verbose_name='Oxirgi ko\'rinish')
    
    # Django auth fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'login'
    REQUIRED_FIELDS = ['pnfl', 'first_name', 'last_name', 'role']
    
    class Meta:
        verbose_name = 'Foydalanuvchi'
        verbose_name_plural = 'Foydalanuvchilar'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.last_name} {self.first_name} ({self.get_role_display()})"
    
    @property
    def full_name(self):
        """Return full name."""
        parts = [self.last_name, self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        return ' '.join(parts)
    
    @property
    def is_online(self):
        """Check if user is online (active in last 5 minutes)."""
        if not self.last_seen:
            return False
        from django.utils import timezone
        return (timezone.now() - self.last_seen).total_seconds() < 300  # 5 minutes
    
    @property
    def masked_pnfl(self):
        """Return masked PNFL for security (show only last 4 digits)."""
        if len(self.pnfl) >= 4:
            return '*' * (len(self.pnfl) - 4) + self.pnfl[-4:]
        return '*' * len(self.pnfl)
    
    @property
    def cabinet_type(self):
        """Return cabinet type based on role."""
        cabinet_map = {
            'HOKIM': 'hokim',
            'HOKIM_YORDAMCHISI': 'hokimlik',
            'HOKIMLIK_MASUL': 'hokimlik',
            'TASHKILOT_RAHBARI': 'tashkilot',
            'TASHKILOT_MASUL': 'tashkilot',
            'ADMIN': 'admin',
        }
        return cabinet_map.get(self.role, 'user')
    
    def can_add_user_with_role(self, target_role):
        """Check if this user can add a user with the given role."""
        hierarchy = {
            'HOKIM': ['HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
            'HOKIM_YORDAMCHISI': ['HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
            'HOKIMLIK_MASUL': [],
            'TASHKILOT_RAHBARI': ['TASHKILOT_MASUL'],
            'TASHKILOT_MASUL': [],
            'ADMIN': ['HOKIM', 'HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
        }
        return target_role in hierarchy.get(self.role, [])
    
    def activate(self):
        """Activate user."""
        from django.utils import timezone
        self.status = 'FAOL'
        if not self.activated_at:
            self.activated_at = timezone.now()
        self.save(update_fields=['status', 'activated_at'])
    
    def block(self):
        """Block user temporarily."""
        self.status = 'BLOKLANGAN'
        self.save()
    
    def archive(self):
        """Archive user (cannot be reactivated)."""
        self.status = 'ARXIV'
        self.is_active = False
        self.save()


class UserAssignment(BaseModel):
    """
    Track who assigned whom.
    Important for audit and hierarchy verification.
    """
    assigned_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name='Biriktirilgan foydalanuvchi'
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='made_assignments',
        verbose_name='Biriktirgan foydalanuvchi'
    )
    assigned_role = models.CharField(max_length=20, verbose_name='Biriktirilgan rol')
    notes = models.TextField(blank=True, verbose_name='Izoh')
    
    class Meta:
        verbose_name = 'Foydalanuvchi biriktirmasi'
        verbose_name_plural = 'Foydalanuvchi biriktirmalari'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.assigned_by} -> {self.assigned_user} ({self.assigned_role})"
