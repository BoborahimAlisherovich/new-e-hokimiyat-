"""
OneID integratsiya signallari.

Ushbu modul OneID bilan bog'liq hodisalarni qayta ishlash uchun signallarni o'z ichiga oladi.
"""

import logging
from django.db.models.signals import post_save, pre_delete, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import OneIDToken, OneIDUserLog

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=OneIDToken)
def oneid_token_created(sender, instance, created, **kwargs):
    """
    OneID token yaratilganda log yozish.
    
    Args:
        sender: Model klassi
        instance: OneIDToken obyekti
        created: Yangi yaratilganligi
    """
    if created:
        logger.info(f"Yangi OneID token yaratildi: {instance.user.pnfl}")
        
        # Log yozish
        OneIDUserLog.objects.create(
            user=instance.user,
            action='LOGIN',
            oneid_user_id=instance.oneid_user_id,
            new_data={
                'session_id': str(instance.session_id),
                'expires_at': instance.expires_at.isoformat() if instance.expires_at else None
            },
            success=True
        )
    else:
        # Token yangilangan bo'lsa
        logger.info(f"OneID token yangilandi: {instance.user.pnfl}")
        
        OneIDUserLog.objects.create(
            user=instance.user,
            action='TOKEN_REFRESH',
            oneid_user_id=instance.oneid_user_id,
            new_data={
                'session_id': str(instance.session_id),
                'expires_at': instance.expires_at.isoformat() if instance.expires_at else None
            },
            success=True
        )


@receiver(pre_delete, sender=OneIDToken)
def oneid_token_deleted(sender, instance, **kwargs):
    """
    OneID token o'chirilganda log yozish.
    
    Args:
        sender: Model klassi
        instance: OneIDToken obyekti
    """
    logger.info(f"OneID token o'chirildi: {instance.user.pnfl}")
    
    # Log yozish
    OneIDUserLog.objects.create(
        user=instance.user,
        action='LOGOUT',
        oneid_user_id=instance.oneid_user_id,
        old_data={
            'session_id': str(instance.session_id),
            'expires_at': instance.expires_at.isoformat() if instance.expires_at else None
        },
        success=True
    )


@receiver(post_save, sender=User)
def user_profile_updated(sender, instance, created, **kwargs):
    """
    Foydalanuvchi profili yangilanganda OneID log yozish.
    
    Args:
        sender: Model klassi
        instance: User obyekti
        created: Yangi yaratilganligi
    """
    if not created:
        # Faqat mavjud foydalanuvchi ma'lumotlari o'zgarganda
        try:
            # OneID token borligini tekshirish
            oneid_token = OneIDToken.objects.filter(user=instance).first()
            if oneid_token:
                # Ma'lumotlar o'zgarishini tekshirish
                changed_fields = []
                
                # Track qilingan maydonlar
                tracked_fields = ['first_name', 'last_name', 'middle_name', 'phone', 'email']
                
                for field in tracked_fields:
                    old_value = getattr(instance.__class__.objects.get(pk=instance.pk), field)
                    new_value = getattr(instance, field)
                    if old_value != new_value:
                        changed_fields.append({
                            'field': field,
                            'old': old_value,
                            'new': new_value
                        })
                
                if changed_fields:
                    logger.info(f"Foydalanuvchi ma'lumotlari o'zgardi: {instance.pnfl}")
                    
                    OneIDUserLog.objects.create(
                        user=instance,
                        action='PROFILE_UPDATE',
                        oneid_user_id=oneid_token.oneid_user_id,
                        old_data={field['field']: field['old'] for field in changed_fields},
                        new_data={field['field']: field['new'] for field in changed_fields},
                        success=True
                    )
        except Exception as e:
            logger.error(f"User profile update log xatolik: {e}")


@receiver(post_delete, sender=User)
def user_deleted(sender, instance, **kwargs):
    """
    Foydalanuvchi o'chirilganda OneID log yozish.
    
    Args:
        sender: Model klassi
        instance: User obyekti
    """
    logger.info(f"Foydalanuvchi o'chirildi: {instance.pnfl}")
    
    # Log yozish (agar OneID token bo'lsa)
    try:
        oneid_token = OneIDToken.objects.filter(user=instance).first()
        if oneid_token:
            OneIDUserLog.objects.create(
                user=instance,
                action='LOGOUT',
                oneid_user_id=oneid_token.oneid_user_id,
                old_data={
                    'pnfl': instance.pnfl,
                    'full_name': instance.full_name,
                    'role': instance.role
                },
                new_data={'deleted': True},
                success=True
            )
    except Exception as e:
        logger.error(f"User deletion log xatolik: {e}")
