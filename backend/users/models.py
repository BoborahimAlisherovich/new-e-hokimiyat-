"""
User models for E-Hokimiyat platform.

Based on PNFL (JSHSHR) + OneID authentication model.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from core.models import BaseModel
import uuid


class UserManager(BaseUserManager):
    """
    Custom user manager for PNFL-based authentication.
    """
    
    def create_user(self, pnfl, password=None, **extra_fields):
        if not pnfl:
            raise ValueError('PNFL majburiy')
        
        user = self.model(pnfl=pnfl, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, pnfl, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('status', 'FAOL')
        
        return self.create_user(pnfl, password, **extra_fields)


class Role(models.Model):
    """
    Role model for role-based access control.
    """
    ROLE_CHOICES = [
        ('HOKIM', 'Hokim'),
        ('HOKIMLIK_MASUL', "Hokimlik mas'uli"),
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


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model based on PNFL (JSHSHR) identification.
    
    User Lifecycle:
    - DRAFT: PNFL entered, not yet activated
    - KUTILMOQDA: Waiting for OneID login
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
        ('HOKIMLIK_MASUL', "Hokimlik mas'uli"),
        ('TASHKILOT_RAHBARI', 'Tashkilot rahbari'),
        ('TASHKILOT_MASUL', "Tashkilot mas'uli"),
        ('ADMIN', 'Administrator'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # PNFL - Primary identifier (14 digits)
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
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name='Tashkilot'
    )
    position = models.CharField(max_length=200, blank=True, verbose_name='Lavozim')
    
    # Status and OneID
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='KUTILMOQDA',
        verbose_name='Holat'
    )
    oneid_connected = models.BooleanField(default=False, verbose_name='OneID ulangan')
    
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
    
    USERNAME_FIELD = 'pnfl'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']
    
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
            'HOKIMLIK_MASUL': 'hokimlik',
            'TASHKILOT_RAHBARI': 'tashkilot',
            'TASHKILOT_MASUL': 'tashkilot',
            'ADMIN': 'admin',
        }
        return cabinet_map.get(self.role, 'user')
    
    def can_add_user_with_role(self, target_role):
        """Check if this user can add a user with the given role."""
        hierarchy = {
            'HOKIM': ['HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
            'HOKIMLIK_MASUL': ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
            'TASHKILOT_RAHBARI': ['TASHKILOT_MASUL'],
            'TASHKILOT_MASUL': [],
            'ADMIN': ['HOKIM', 'HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
        }
        return target_role in hierarchy.get(self.role, [])
    
    def activate(self):
        """Activate user after OneID login."""
        from django.utils import timezone
        self.status = 'FAOL'
        self.oneid_connected = True
        self.activated_at = timezone.now()
        if not self.first_login_at:
            self.first_login_at = timezone.now()
        self.save()
    
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
