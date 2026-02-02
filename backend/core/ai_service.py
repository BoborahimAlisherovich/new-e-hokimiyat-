"""
AI Service - Markaziy AI xizmat.

Bu modul quyidagi funksiyalarni bajaradi:
- OpenAI/Claude bilan integratsiya
- Hokim buyruqlarini tahlil qilish
- Topshiriq yaratish/yopish
- Hisobot generatsiya
- Chat xabarlarini tahlil qilish
- Audio transkripsiya
"""

import os
import re
import json
import logging
from typing import Optional, Dict, Any, List, Union, cast
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.db.models import Count, Avg, Q

logger = logging.getLogger(__name__)


class AIService:
    """
    Markaziy AI xizmat klassi.
    """
    
    def __init__(self):
        self.provider = getattr(settings, 'AI_PROVIDER', 'openai')
        self.api_key = getattr(settings, 'AI_API_KEY', os.getenv('OPENAI_API_KEY', ''))
        self.model = getattr(settings, 'AI_MODEL', 'gpt-4o-mini')
        
        self.system_prompt = """
    Sen E-Hokimiyat tizimining AI yordamchisisan. Sening vazifang:

    1. Hokim va hokimlik xodimlariga topshiriqlar bo'yicha yordam berish
    2. Murojaatlarni tahlil qilish va holat haqida xabar berish
    3. Hisobotlar yaratish
    4. Topshiriqlarni nazorat qilish

    Sen quyidagi buyruqlarni bajarishga qodirsan:
    - TOPSHIRIQ_YARAT: Yangi topshiriq yaratish
    - TOPSHIRIQ_YOP: Topshiriqni nazoratdan yechish
    - HISOBOT_YARAT: Hisobot generatsiya qilish
    - MUROJAAT_YOP: Murojaatni hal etilgan deb belgilash
    - TASHKILOT_TAYINLA: Topshiriqni tashkilotga tayinlash

    Sen quyidagi ma'lumotlarni ham berishing mumkin:
    - Tashkilotlar statistikasi va holati
    - Foydalanuvchilar statistikasi
    - Murojaatlar statistikasi
    - Topshiriqlar statistikasi
    - Bildirishnomalar statistikasi
    - Telegram bot holati

    Javoblaringda har doim aniq va qisqa bo'l. Har doim O'zbek tilida javob ber.
    Foydalanuvchi boshqa tilda yozsa ham, so'rovni tushunishga harakat qil va O'zbek tilida javob ber.
    Agar buyruq aniqlanmasa, foydalanuvchidan aniqlashtirish so'ra.
    """
    
    def get_client(self) -> Any:
        """AI client olish"""
        if self.provider == 'openai':
            try:
                from openai import OpenAI
                return OpenAI(api_key=self.api_key)
            except ImportError:
                logger.error("OpenAI kutubxonasi o'rnatilmagan")
                return None
        elif self.provider == 'anthropic':
            try:
                from anthropic import Anthropic
                return Anthropic(api_key=self.api_key)
            except ImportError:
                logger.error("Anthropic kutubxonasi o'rnatilmagan")
                return None
        return None
    
    def chat(self, messages: List[Dict[str, Any]], user: Any = None) -> str:
        """AI bilan suhbat"""
        client = self.get_client()
        if not client:
            return "AI xizmati hozirda mavjud emas. Iltimos, keyinroq urinib ko'ring."
        
        # Kontekst qo'shish
        context = self._get_current_context(user) if user else ""
        
        system_message = self.system_prompt
        if context:
            system_message += f"\n\nJoriy holat:\n{context}"
        
        full_messages = [
            {"role": "system", "content": system_message}
        ] + messages
        
        try:
            if self.provider == 'openai':
                response = client.chat.completions.create(
                    model=self.model,
                    messages=full_messages,
                    max_tokens=2000,
                    temperature=0.7
                )
                return response.choices[0].message.content or ""
            elif self.provider == 'anthropic':
                response = client.messages.create(
                    model=self.model,
                    max_tokens=2000,
                    system=system_message,
                    messages=messages  # type: ignore
                )
                # Get text from first content block
                content_block = response.content[0]
                return getattr(content_block, 'text', str(content_block))
            else:
                return "Noma'lum AI provider"
        except Exception as e:
            logger.error(f"AI chat xatosi: {e}")
            return f"Xatolik yuz berdi: {str(e)}"
    
    def _get_current_context(self, user) -> str:
        """Foydalanuvchi uchun joriy kontekst olish"""
        from tasks.models import Task
        from telegram_bot.models import TelegramAppeal
        
        context_parts = []
        
        # Topshiriqlar statistikasi
        now = timezone.now()
        tasks = Task.objects.all()
        
        active_tasks = tasks.filter(status__in=['YANGI', 'IJRODA']).count()
        overdue_tasks = tasks.filter(status='MUDDATI_KECH').count()
        completed_today = tasks.filter(
            status='BAJARILDI',
            updated_at__date=now.date()
        ).count()
        
        context_parts.append(f"""
Topshiriqlar:
- Faol topshiriqlar: {active_tasks}
- Muddati o'tgan: {overdue_tasks}
- Bugun bajarilgan: {completed_today}
""")
        
        # Murojaatlar
        appeals = TelegramAppeal.objects.all()
        pending_appeals = appeals.filter(status__in=['pending_ai', 'pending_review']).count()
        
        context_parts.append(f"""
Murojaatlar:
- Ko'rib chiqilmagan: {pending_appeals}
""")
        
        return "\n".join(context_parts)
    
    def detect_intent(self, text: str) -> Dict[str, Any]:
        """
        Matndan maqsadni aniqlash.
        
        Returns:
            {
                "intent": "CREATE_TASK|CLOSE_TASK|REPORT|...",
                "confidence": 0.0-1.0,
                "parameters": {...}
            }
        """
        text_lower = text.lower()
        
        # Oddiy keyword matching
        intents = {
            'CREATE_TASK': ['topshiriq yarat', 'vazifa ber', 'buyruq ber', 'tayinla'],
            'CLOSE_TASK': ['topshiriqni yop', 'nazoratdan yech', 'yakunla', 'tugat'],
            'GENERATE_REPORT': ['hisobot', 'statistika', 'tahlil', 'natija'],
            'CLOSE_APPEAL': ['murojaatni yop', 'hal qilingan', 'javob berilgan'],
            'STATUS_CHECK': ['umumiy holat', 'umumiy statistika', 'umumiy ko‘rsatkich'],
            'ORGANIZATION_STATUS': ['tashkilot holati', 'tashkilot bo‘yicha', 'tashkilot statistikasi'],
            'USERS_STATUS': ['foydalanuvchi', 'kadrlar', 'xodimlar'],
            'APPEALS_STATUS': ['murojaatlar', 'appeal', 'murojaat holati'],
            'TASKS_STATUS': ['topshiriqlar holati', 'topshiriqlar', 'vazifalar'],
            'NOTIFICATIONS_STATUS': ['bildirishnoma', 'notification'],
            'TELEGRAM_STATUS': ['telegram bot', 'bot holati', 'bot ishlayaptimi'],
            'LIST_ORGANIZATIONS': ['tashkilotlar ro‘yxati', 'tashkilotlar', 'tashkilot nomlari'],
            'LIST_USERS': ['foydalanuvchilar ro‘yxati', 'xodimlar ro‘yxati'],
        }
        
        for intent, keywords in intents.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return {
                        "intent": intent,
                        "confidence": 0.8,
                        "parameters": self._extract_parameters(text, intent)
                    }
        
        return {
            "intent": "UNKNOWN",
            "confidence": 0.0,
            "parameters": {}
        }
    
    def _extract_parameters(self, text: str, intent: str) -> Dict:
        """Matndan parametrlarni ajratib olish"""
        params = {}
        
        # Raqamlarni topish (topshiriq/murojaat ID)
        import re
        numbers = re.findall(r'#?(\d+)', text)
        if numbers:
            params['id'] = int(numbers[0])
        
        # Tashkilot nomini topish
        org_patterns = [
            r'(?:ga|ning)\s+(.+?)(?:\s+ga|\s+ni|\s*$)',
        ]
        for pattern in org_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                params['organization_name'] = match.group(1).strip()
                break
        
        # Muddat
        deadline_patterns = {
            r'(\d+)\s*kun': 'days',
            r'(\d+)\s*hafta': 'weeks',
            r'(\d+)\s*oy': 'months',
        }
        for pattern, unit in deadline_patterns.items():
            match = re.search(pattern, text)
            if match:
                params['deadline'] = {
                    'value': int(match.group(1)),
                    'unit': unit
                }
                value = int(match.group(1))
                if unit == 'days':
                    params['deadline_days'] = value
                elif unit == 'weeks':
                    params['deadline_days'] = value * 7
                elif unit == 'months':
                    params['deadline_days'] = value * 30
                break

        if intent == 'CREATE_TASK':
            # Topshiriq nomi
            title_patterns = [
                r'topshiriq\s+nomi\s*[:\-]?\s*(.+?)(?=\s+(topshiriq\s+tavsifi|tavsif|muddat|barchaga|hamma|$))',
                r'sarlavha\s*[:\-]?\s*(.+?)(?=\s+(tavsif|muddat|barchaga|hamma|$))',
            ]
            for pattern in title_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    params['title'] = match.group(1).strip()
                    break

            # Topshiriq tavsifi
            description_patterns = [
                r'topshiriq\s+tavsifi\s*[:\-]?\s*(.+?)(?=\s+(muddat|barchaga|hamma|$))',
                r'tavsif\s*[:\-]?\s*(.+?)(?=\s+(muddat|barchaga|hamma|$))',
            ]
            for pattern in description_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    params['description'] = match.group(1).strip()
                    break

            # Barchaga tayinlash
            if re.search(r'\b(barchaga|hamma|hammasiga)\b', text, re.IGNORECASE):
                params['assign_all'] = True
        
        return params
    
    def execute_action(self, action) -> Dict:
        """AI harakatini bajarish"""
        from tasks.models import Task, TaskOrganization
        from telegram_bot.models import TelegramAppeal
        from organizations.models import Organization
        
        action_type = action.action_type
        params = action.parameters
        result = {}
        
        try:
            if action_type == 'CREATE_TASK':
                result = self._create_task(params, action.initiated_by)
                
            elif action_type == 'CLOSE_TASK':
                result = self._close_task(params, action.initiated_by)
                
            elif action_type == 'REMOVE_CONTROL':
                result = self._remove_control(params, action.initiated_by)
                
            elif action_type == 'GENERATE_REPORT':
                result = self._generate_report(params, action.initiated_by, action.conversation)
                
            elif action_type == 'CLOSE_APPEAL':
                result = self._close_appeal(params, action.initiated_by)
                
            elif action_type == 'SEND_NOTIFICATION':
                result = self._send_notification(params)
                
        except Exception as e:
            logger.error(f"Action execution error: {e}")
            result = {'success': False, 'error': str(e)}
        
        return result

    def handle_query(self, intent: str, params: Dict[str, Any], user=None) -> str:
        """AI so'rovlarini bazadan to'g'ridan-to'g'ri javob berish"""
        from tasks.models import Task, TaskOrganization
        from telegram_bot.models import TelegramAppeal, BotSettings
        from organizations.models import Organization
        from notifications.models import Notification
        from django.contrib.auth import get_user_model

        User = get_user_model()

        if intent == 'STATUS_CHECK':
            return self._get_current_context(user)

        if intent == 'ORGANIZATION_STATUS':
            org_name = params.get('organization_name')
            if not org_name:
                return "Qaysi tashkilot bo'yicha ma'lumot kerak? Tashkilot nomini yozing."

            org = Organization.objects.filter(name__icontains=org_name).first()
            if not org:
                samples = list(Organization.objects.values_list('name', flat=True)[:5])
                return (
                    "Tashkilot topilmadi. Masalan: "
                    + ", ".join(samples)
                )

            task_qs = TaskOrganization.objects.filter(organization=org)
            return (
                f"Tashkilot: {org.name}\n"
                f"- Faol: {'Ha' if org.is_active else 'Yo‘q'}\n"
                f"- Xodimlar: {org.users.count()}\n"  # type: ignore[attr-defined]
                f"- Topshiriqlar jami: {task_qs.count()}\n"
                f"- Ijroda: {task_qs.filter(status='IJRODA').count()}\n"
                f"- Muddati o'tgan: {task_qs.filter(status='MUDDATI_KECH').count()}"
            )

        if intent == 'LIST_ORGANIZATIONS':
            names = list(Organization.objects.values_list('name', flat=True)[:20])
            return "Tashkilotlar: " + (", ".join(names) if names else "Tashkilotlar yo'q")

        if intent == 'USERS_STATUS':
            total = User.objects.count()
            active = User.objects.filter(status='FAOL').count() if hasattr(User, 'status') else total
            return f"Foydalanuvchilar: jami {total}, faol {active}"

        if intent == 'LIST_USERS':
            users = User.objects.all()[:20]
            names = [u.get_full_name() or getattr(u, 'email', '') or str(u.id) for u in users]  # type: ignore[attr-defined]
            return "Foydalanuvchilar: " + (", ".join(names) if names else "Foydalanuvchilar yo'q")

        if intent == 'APPEALS_STATUS':
            total = TelegramAppeal.objects.count()
            pending = TelegramAppeal.objects.filter(status__in=['pending_ai', 'pending_review']).count()
            resolved = TelegramAppeal.objects.filter(status='resolved').count()
            return f"Murojaatlar: jami {total}, ko'rib chiqilmagan {pending}, hal etilgan {resolved}"

        if intent == 'TASKS_STATUS':
            total = Task.objects.count()
            active = Task.objects.filter(status__in=['YANGI', 'IJRODA']).count()
            overdue = Task.objects.filter(status='MUDDATI_KECH').count()
            return f"Topshiriqlar: jami {total}, faol {active}, muddati o'tgan {overdue}"

        if intent == 'NOTIFICATIONS_STATUS':
            total = Notification.objects.count()
            unread = Notification.objects.filter(is_read=False).count()
            return f"Bildirishnomalar: jami {total}, o'qilmagan {unread}"

        if intent == 'TELEGRAM_STATUS':
            active = BotSettings.objects.filter(is_active=True).exists()
            return f"Telegram bot: {'faol' if active else 'faol emas'}"

        return "So'rov tushunilmadi."
    
    def _create_task(self, params: Dict, user) -> Dict:
        """Topshiriq yaratish"""
        from tasks.models import Task, TaskOrganization
        from organizations.models import Organization
        
        title = params.get('title', 'AI tomonidan yaratilgan topshiriq')
        description = params.get('description', '')
        priority = params.get('priority', 'ODDIY')
        deadline_days = params.get('deadline_days', 7)
        org_ids = params.get('organization_ids', [])
        assign_all = params.get('assign_all', False)
        
        task = Task.objects.create(
            title=title,
            description=description,
            priority=priority,
            deadline=timezone.now() + timedelta(days=deadline_days),
            created_by=user,
            source='AI'
        )
        
        if assign_all:
            org_ids = list(Organization.objects.values_list('id', flat=True))

        for org_id in org_ids:
            try:
                org = Organization.objects.get(id=org_id)
                TaskOrganization.objects.create(task=task, organization=org)
            except Organization.DoesNotExist:
                pass
        
        task_id = str(task.id)
        return {
            'success': True,
            'task_id': task_id,
            'message': f"Topshiriq #{task_id} yaratildi"
        }
    
    def _close_task(self, params: Dict, user) -> Dict:
        """Topshiriqni yopish"""
        from tasks.models import Task
        
        task_id = params.get('task_id')
        if not task_id:
            return {'success': False, 'error': 'Topshiriq ID ko\'rsatilmagan'}
        
        try:
            task = Task.objects.get(id=task_id)
            task.status = 'NAZORATDAN_YECHILDI'
            task.save()
            
            return {
                'success': True,
                'task_id': task_id,
                'message': f"Topshiriq #{task_id} nazoratdan yechildi"
            }
        except Task.DoesNotExist:
            return {'success': False, 'error': f'Topshiriq #{task_id} topilmadi'}
    
    def _remove_control(self, params: Dict, user) -> Dict:
        """Nazoratdan yechish"""
        return self._close_task(params, user)
    
    def _generate_report(self, params: Dict, user, conversation) -> Dict:
        """Hisobot yaratish"""
        from core.models import AIReport
        from tasks.models import Task
        from telegram_bot.models import TelegramAppeal
        
        report_type = params.get('report_type', 'DAILY_SUMMARY')
        period_days = params.get('period_days', 7)
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=period_days)
        
        # Ma'lumotlarni yig'ish
        tasks = Task.objects.filter(created_at__date__gte=start_date)
        appeals = TelegramAppeal.objects.filter(created_at__date__gte=start_date)
        
        content = {
            'tasks': {
                'total': tasks.count(),
                'by_status': dict(tasks.values_list('status').annotate(count=Count('id'))),
                'by_priority': dict(tasks.values_list('priority').annotate(count=Count('id'))),
            },
            'appeals': {
                'total': appeals.count(),
                'by_status': dict(appeals.values_list('status').annotate(count=Count('id'))),
            }
        }
        
        # AI bilan summary yaratish
        summary = self._generate_summary(content, report_type)
        
        # Hisobotni saqlash
        report = AIReport.objects.create(
            report_type=report_type,
            title=f"{report_type} - {end_date}",
            summary=summary,
            content=content,
            period_start=start_date,
            period_end=end_date,
            requested_by=user,
            conversation=conversation
        )
        
        return {
            'success': True,
            'report_id': report.id,
            'summary': summary,
            'message': 'Hisobot yaratildi'
        }
    
    def _generate_summary(self, content: Dict, report_type: str) -> str:
        """AI bilan hisobot qisqacha mazmunini yaratish"""
        tasks_data = content.get('tasks', {})
        appeals_data = content.get('appeals', {})
        
        summary_parts = []
        
        if tasks_data:
            total = tasks_data.get('total', 0)
            summary_parts.append(f"Jami topshiriqlar: {total}")
            
            by_status = tasks_data.get('by_status', {})
            if by_status:
                status_str = ", ".join([f"{k}: {v}" for k, v in by_status.items()])
                summary_parts.append(f"Holat bo'yicha: {status_str}")
        
        if appeals_data:
            total = appeals_data.get('total', 0)
            summary_parts.append(f"Jami murojaatlar: {total}")
        
        return "\n".join(summary_parts)
    
    def _close_appeal(self, params: Dict, user) -> Dict:
        """Murojaatni yopish"""
        from telegram_bot.models import TelegramAppeal
        
        appeal_id = params.get('appeal_id')
        if not appeal_id:
            return {'success': False, 'error': 'Murojaat ID ko\'rsatilmagan'}
        
        try:
            appeal = TelegramAppeal.objects.get(id=appeal_id)
            appeal.status = 'resolved'
            appeal.closed_at = timezone.now()
            appeal.save()
            
            return {
                'success': True,
                'appeal_id': appeal_id,
                'message': f"Murojaat #{appeal.appeal_number} hal etildi"
            }
        except TelegramAppeal.DoesNotExist:
            return {'success': False, 'error': f'Murojaat #{appeal_id} topilmadi'}
    
    def _send_notification(self, params: Dict) -> Dict:
        """Bildirishnoma yuborish"""
        from notifications.models import Notification
        
        user_ids = params.get('user_ids', [])
        title = params.get('title', 'AI bildirishnomasi')
        message = params.get('message', '')
        
        created = 0
        for user_id in user_ids:
            try:
                Notification.objects.create(
                    user_id=user_id,
                    title=title,
                    message=message,
                    type='SYSTEM'
                )
                created += 1
            except Exception as e:
                logger.error(f"Notification error: {e}")
        
        return {
            'success': True,
            'notifications_sent': created,
            'message': f"{created} ta bildirishnoma yuborildi"
        }
    
    def transcribe_audio(self, audio_file) -> str:
        """Audio faylni matnga aylantirish (Whisper)"""
        client = self.get_client()
        if not client or self.provider != 'openai':
            return "Audio transkripsiya faqat OpenAI bilan ishlaydi"
        
        try:
            # Read bytes to ensure compatible file type for OpenAI SDK
            try:
                audio_file.seek(0)
            except Exception:
                try:
                    audio_file.file.seek(0)
                except Exception:
                    pass

            file_name = getattr(audio_file, 'name', 'audio.webm')
            file_bytes = audio_file.read() if hasattr(audio_file, 'read') else None
            if not file_bytes and hasattr(audio_file, 'file'):
                file_bytes = audio_file.file.read()

            transcription_params = {
                "model": "whisper-1",
                "file": (file_name, file_bytes or b""),
            }

            language = getattr(settings, "AI_TRANSCRIPTION_LANGUAGE", "auto")
            if language and language != "auto":
                transcription_params["language"] = language

            transcription = client.audio.transcriptions.create(
                **transcription_params,
                prompt="Transcribe in Uzbek (Latin). If unclear, keep proper names as is."
            )
            return transcription.text
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return f"Xatolik: {str(e)}"
    
    def analyze_task_comments(self, task) -> Dict:
        """
        Topshiriq xabarlarini tahlil qilish.
        Hal bo'lganlikni aniqlash.
        """
        from tasks.models import TaskMessage
        
        messages = TaskMessage.objects.filter(task=task).order_by('-created_at')[:10]
        
        if not messages:
            return {
                'is_resolved': False,
                'confidence': 0.0,
                'reason': 'Xabarlar yo\'q'
            }
        
        # Oxirgi xabarlarni tahlil qilish
        positive_keywords = ['bajarildi', 'hal qilindi', 'tugadi', 'tayyor', 'yakunlandi']
        negative_keywords = ['bajarilmadi', 'muammo', 'kechiktirildi', 'to\'xtatildi']
        
        latest_message = messages[0].content.lower()
        
        is_positive = any(kw in latest_message for kw in positive_keywords)
        is_negative = any(kw in latest_message for kw in negative_keywords)
        
        if is_positive and not is_negative:
            return {
                'is_resolved': True,
                'confidence': 0.8,
                'reason': 'Xabarlarda ijobiy so\'zlar topildi',
                'recommendation': 'Topshiriqni yopish tavsiya etiladi'
            }
        
        return {
            'is_resolved': False,
            'confidence': 0.5,
            'reason': 'Aniq emas',
            'recommendation': 'Qo\'shimcha tekshirish kerak'
        }
    
    def monitor_tasks(self) -> List[Dict]:
        """
        Barcha topshiriqlarni monitoring qilish.
        Celery task orqali chaqiriladi.
        """
        from tasks.models import Task
        from core.models import AITaskMonitor
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        alerts = []
        
        # Muddati yaqinlashgan topshiriqlar
        tomorrow = timezone.now() + timedelta(days=1)
        urgent_tasks = Task.objects.filter(
            status__in=['YANGI', 'IJRODA'],
            deadline__lte=tomorrow
        )
        
        for task in urgent_tasks:
            monitor, created = AITaskMonitor.objects.get_or_create(task=task)
            
            if not monitor.warning_sent:
                # Ogohlantirish yuborish
                monitor.risk_level = 'HIGH'
                monitor.ai_notes = f"Muddat: {task.deadline}. Yaqinda tugaydi!"
                monitor.warning_sent = True
                monitor.warning_sent_at = timezone.now()
                monitor.save()
                
                alerts.append({
                    'task_id': task.id,
                    'title': task.title,
                    'deadline': str(task.deadline),
                    'alert_type': 'DEADLINE_APPROACHING'
                })
        
        # Muddati o'tgan topshiriqlar
        overdue_tasks = Task.objects.filter(
            status__in=['YANGI', 'IJRODA'],
            deadline__lt=timezone.now()
        )
        
        for task in overdue_tasks:
            if task.status != 'MUDDATI_KECH':
                task.status = 'MUDDATI_KECH'
                task.save()
                
                alerts.append({
                    'task_id': task.id,
                    'title': task.title,
                    'deadline': str(task.deadline),
                    'alert_type': 'OVERDUE'
                })
        
        return alerts

    # ==========================================================================
    # TELEGRAM MUROJAATLAR BILAN ISHLASH
    # ==========================================================================
    
    def analyze_appeal(self, appeal) -> Dict:
        """
        Telegram murojaatni AI orqali tahlil qilish.
        
        Returns:
            {
                "category": "infratuzilma|ijtimoiy|...",
                "priority": "past|oddiy|yuqori|favqulodda",
                "sentiment": "ijobiy|neytral|salbiy",
                "suggested_organizations": [...],
                "summary": "...",
                "suggested_response": "...",
                "requires_urgent_attention": bool
            }
        """
        client = self.get_client()
        if not client:
            return self._fallback_appeal_analysis(appeal)
        
        # Murojaat matni va kontekst
        appeal_text = appeal.appeal_text or ""
        user_name = appeal.user.full_name if appeal.user else "Noma'lum"
        
        analysis_prompt = f"""
Quyidagi fuqaro murojaatini tahlil qil:

Murojaat matni: {appeal_text}
Murojaat raqami: #{appeal.appeal_number}
Foydalanuvchi: {user_name}

Quyidagi formatda JSON javob ber:
{{
    "category": "infratuzilma|ijtimoiy|ta'lim|sog'liqni_saqlash|kommunal|boshqa",
    "priority": "past|oddiy|yuqori|favqulodda",
    "sentiment": "ijobiy|neytral|salbiy",
    "summary": "Murojaatning qisqa mazmuni (1-2 gap)",
    "suggested_response": "Fuqaroga tavsiya etiladigan javob",
    "suggested_organizations": ["Tayinlash uchun tashkilot nomlari"],
    "requires_urgent_attention": true/false,
    "keywords": ["asosiy", "kalit", "so'zlar"]
}}

Faqat JSON formatda javob ber, boshqa matn bo'lmasin.
"""
        
        try:
            if self.provider == 'openai':
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "Sen murojaatlarni tahlil qiluvchi AI yordamchisisan. Faqat JSON formatda javob ber."},
                        {"role": "user", "content": analysis_prompt}
                    ],
                    max_tokens=1000,
                    temperature=0.3
                )
                result_text = response.choices[0].message.content
            elif self.provider == 'anthropic':
                response = client.messages.create(
                    model=self.model,
                    max_tokens=1000,
                    messages=[{"role": "user", "content": analysis_prompt}]
                )
                content_block = response.content[0]
                result_text = getattr(content_block, 'text', str(content_block))
            else:
                return self._fallback_appeal_analysis(appeal)
            
            # JSON parse
            if result_text:
                json_match = re.search(r'\\{.*\\}', str(result_text), re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
            return self._fallback_appeal_analysis(appeal)
            
        except Exception as e:
            logger.error(f"Appeal analysis error: {e}")
            return self._fallback_appeal_analysis(appeal)
    
    def _fallback_appeal_analysis(self, appeal) -> Dict:
        """AI ishlamasa oddiy tahlil"""
        text = (appeal.appeal_text or "").lower()
        
        # Oddiy keyword tahlil
        categories = {
            'infratuzilma': ['yo\'l', 'ko\'prik', 'bino', 'qurilish', 'ta\'mir'],
            'ijtimoiy': ['yordam', 'nafaqa', 'kambag\'al', 'nogironlik'],
            'ta\'lim': ['maktab', 'bog\'cha', 'o\'qituvchi', 'ta\'lim'],
            'sog\'liqni_saqlash': ['shifoxona', 'shifokor', 'dori', 'kasallik'],
            'kommunal': ['suv', 'gaz', 'elektr', 'issiqlik', 'chiqindi'],
        }
        
        detected_category = 'boshqa'
        for cat, keywords in categories.items():
            if any(kw in text for kw in keywords):
                detected_category = cat
                break
        
        # Shoshilinchlik
        urgent_keywords = ['shoshilinch', 'favqulodda', 'tezkor', 'halokat', 'portlash']
        is_urgent = any(kw in text for kw in urgent_keywords)
        
        return {
            "category": detected_category,
            "priority": "yuqori" if is_urgent else "oddiy",
            "sentiment": "neytral",
            "summary": text[:100] + "..." if len(text) > 100 else text,
            "suggested_response": "Murojaatingiz qabul qilindi. Tez orada ko'rib chiqiladi.",
            "suggested_organizations": [],
            "requires_urgent_attention": is_urgent,
            "keywords": []
        }
    
    def generate_appeal_response(self, appeal, admin_notes: str = "") -> str:
        """
        Murojaat uchun AI yordamida javob tayyorlash.
        Admin o'z izohini qo'shishi mumkin.
        """
        client = self.get_client()
        if not client:
            return self._default_appeal_response(appeal)
        
        prompt = f"""
Quyidagi fuqaro murojaatiga rasmiy javob tayyorla:

Murojaat: {appeal.appeal_text}
Murojaat raqami: #{appeal.appeal_number}
Holat: {appeal.get_status_display() if hasattr(appeal, 'get_status_display') else appeal.status}

{f"Admin izohi: {admin_notes}" if admin_notes else ""}

Javob quyidagi talablarga javob bersin:
1. Rasmiy va hurmatli uslubda bo'lsin
2. O'zbek tilida bo'lsin
3. Fuqaroning muammosi tushunilganini bildirsin
4. Qanday choralar ko'rilayotgani haqida xabar bersin
5. 2-4 gapdan iborat bo'lsin
"""
        
        try:
            if self.provider == 'openai':
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "Sen hokimlik xodimi sifatida fuqarolarga rasmiy javob yozasan."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=500,
                    temperature=0.5
                )
                content = response.choices[0].message.content
                return content or self._default_appeal_response(appeal)
            elif self.provider == 'anthropic':
                response = client.messages.create(
                    model=self.model,
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                content_block = response.content[0]
                return getattr(content_block, 'text', str(content_block))
        except Exception as e:
            logger.error(f"Generate response error: {e}")
        
        return self._default_appeal_response(appeal)
    
    def _default_appeal_response(self, appeal) -> str:
        """Standart javob"""
        return f"""Hurmatli fuqaro!

Sizning #{appeal.appeal_number} raqamli murojaatingiz qabul qilindi va ko'rib chiqilmoqda. 

Tez orada natija haqida xabar beramiz.

Hurmat bilan,
Hatirchi tuman hokimligi"""
    
    def should_auto_close_appeal(self, appeal) -> Dict:
        """
        Murojaatni avtomatik yopish kerakmi tekshirish.
        Chat tarixini tahlil qiladi.
        """
        from telegram_bot.models import AppealMessage
        
        messages = AppealMessage.objects.filter(appeal=appeal).order_by('-created_at')[:10]
        
        if not messages:
            return {"should_close": False, "reason": "Xabarlar yo'q"}
        
        # Oxirgi xabar admindan bo'lsa va 48 soat o'tgan bo'lsa
        last_message = messages.first()
        if last_message and last_message.is_from_admin:
            time_since = timezone.now() - last_message.created_at
            if time_since > timedelta(hours=48):
                return {
                    "should_close": True,
                    "reason": "Admin javob berdi, 48 soat ichida fuqaro javob bermadi",
                    "confidence": 0.8
                }
        
        # Xabarlar mazmunini tekshirish
        client = self.get_client()
        if client and last_message:
            messages_text = "\n".join([
                f"{'Admin' if m.is_from_admin else 'Fuqaro'}: {m.text}"
                for m in reversed(list(messages)[:5])
            ])
            
            try:
                prompt = f"""
Quyidagi chat tarixini tahlil qil va muammo hal bo'lganmi aniqla:

{messages_text}

JSON formatda javob ber:
{{"resolved": true/false, "confidence": 0.0-1.0, "reason": "sabab"}}
"""
                if self.provider == 'openai':
                    response = client.chat.completions.create(
                        model=self.model,
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=200,
                        temperature=0.2
                    )
                    content = response.choices[0].message.content or "{}"
                    result = json.loads(content)
                    return {
                        "should_close": result.get("resolved", False),
                        "reason": result.get("reason", ""),
                        "confidence": result.get("confidence", 0.5)
                    }
            except Exception as e:
                logger.error(f"Auto-close analysis error: {e}")
        
        return {"should_close": False, "reason": "Tahlil qilib bo'lmadi"}
    
    def get_daily_summary(self) -> str:
        """
        Kunlik qisqacha hisobot yaratish.
        Hokim uchun ertalabki briefing.
        """
        from tasks.models import Task
        from telegram_bot.models import TelegramAppeal
        
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        
        # Topshiriqlar
        tasks_created_today = Task.objects.filter(created_at__date=today).count()
        tasks_completed_today = Task.objects.filter(status='BAJARILDI', updated_at__date=today).count()
        tasks_overdue = Task.objects.filter(status='MUDDATI_KECH').count()
        tasks_active = Task.objects.filter(status__in=['YANGI', 'IJRODA']).count()
        
        # Murojaatlar
        appeals_today = TelegramAppeal.objects.filter(created_at__date=today).count()
        appeals_resolved_today = TelegramAppeal.objects.filter(
            status='resolved', 
            closed_at__date=today
        ).count()
        appeals_pending = TelegramAppeal.objects.filter(
            status__in=['pending_ai', 'pending_review', 'in_progress']
        ).count()
        
        summary = f"""
📊 KUNLIK HISOBOT - {today.strftime('%d.%m.%Y')}

📋 TOPSHIRIQLAR:
• Bugun yaratilgan: {tasks_created_today}
• Bugun bajarilgan: {tasks_completed_today}
• Faol topshiriqlar: {tasks_active}
• Muddati o'tgan: {tasks_overdue} ⚠️

📨 MUROJAATLAR:
• Bugun kelgan: {appeals_today}
• Bugun hal etilgan: {appeals_resolved_today}
• Ko'rib chiqilmagan: {appeals_pending}

"""
        
        # Ogohlantirishlar
        if tasks_overdue > 0:
            summary += f"\n⚠️ DIQQAT: {tasks_overdue} ta topshiriq muddati o'tgan!"
        
        if appeals_pending > 10:
            summary += f"\n⚠️ DIQQAT: {appeals_pending} ta murojaat javob kutmoqda!"
        
        return summary
    
    def get_system_health(self) -> Dict:
        """
        Tizim salomatligi haqida ma'lumot.
        """
        from tasks.models import Task
        from telegram_bot.models import TelegramAppeal, BotSettings
        from users.models import User
        from organizations.models import Organization
        
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        return {
            "status": "healthy",
            "timestamp": now.isoformat(),
            "metrics": {
                "users": {
                    "total": User.objects.count(),
                    "active_this_week": User.objects.filter(last_login__gte=week_ago).count()
                },
                "organizations": {
                    "total": Organization.objects.filter(is_active=True).count()
                },
                "tasks": {
                    "total": Task.objects.count(),
                    "active": Task.objects.filter(status__in=['YANGI', 'IJRODA']).count(),
                    "overdue": Task.objects.filter(status='MUDDATI_KECH').count(),
                    "completed_this_week": Task.objects.filter(
                        status='BAJARILDI',
                        updated_at__gte=week_ago
                    ).count()
                },
                "appeals": {
                    "total": TelegramAppeal.objects.count(),
                    "pending": TelegramAppeal.objects.filter(
                        status__in=['pending_ai', 'pending_review']
                    ).count(),
                    "this_week": TelegramAppeal.objects.filter(
                        created_at__gte=week_ago
                    ).count()
                },
                "telegram_bot": {
                    "active": BotSettings.objects.filter(is_active=True).exists()
                },
                "ai_service": {
                    "provider": self.provider,
                    "available": self.get_client() is not None
                }
            }
        }


# Singleton instance
ai_service = AIService()
