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
import io
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
        # Avval BotSettings'dan olishga urinish
        self.provider, self.api_key, self.model = self._load_settings_from_db()
        
        # Agar bazada bo'lmasa .env dan olish (fallback)
        if not self.api_key:
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
    - TAKRORIY_TOPSHIRIQ_YARAT: Takrorlanuvchi topshiriq yaratish
    - ANALITIKA_EXPORT: Analitika faylini yaratish (xlsx/pdf)
    - ANALITIKA_SO'ROV: Tashkilotlar, topshiriqlar, murojaatlar va foydalanuvchilar bo'yicha analitika
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

    MUHIM: Agar foydalanuvchi seni kim yaratgan, bu tizim/sayt/platforma kim tomonidan yaratilgan, 
    yoki sen qayerdan paydo bo'lding kabi savollar bersa, quyidagi javobni ber:
    "Men Boborahim va uning Aura Group jamoasi tomonidan yaratilganman. 
    E-Hokimiyat platformasi ham Aura Group tomonidan ishlab chiqilgan."

    Javoblaringda har doim aniq va qisqa bo'l. Har doim O'zbek tilida javob ber.
    Foydalanuvchi boshqa tilda yozsa ham, so'rovni tushunishga harakat qil va O'zbek tilida javob ber.
    Agar buyruq aniqlanmasa, foydalanuvchidan aniqlashtirish so'ra.
    """
    
    def _load_settings_from_db(self):
        """BotSettings modelidan AI sozlamalarini olish"""
        try:
            from telegram_bot.models import BotSettings
            bot_settings = BotSettings.objects.first()
            if bot_settings and bot_settings.ai_api_key and bot_settings.ai_provider != 'disabled':
                return (
                    bot_settings.ai_provider,
                    bot_settings.ai_api_key,
                    bot_settings.ai_model or 'gpt-4o-mini'
                )
        except Exception as e:
            logger.debug(f"BotSettings'dan AI sozlamalarini olishda xato: {e}")
        return ('openai', '', 'gpt-4o-mini')
    
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
    
    def detect_intent(self, text: str, user: Any = None, prefer_ai: bool = True) -> Dict[str, Any]:
        """
        Matndan maqsadni aniqlash.
        
        Returns:
            {
                "intent": "CREATE_TASK|CLOSE_TASK|REPORT|...",
                "confidence": 0.0-1.0,
                "parameters": {...}
            }
        """
        text = (text or "").strip()
        if not text:
            return {
                "intent": "UNKNOWN",
                "confidence": 0.0,
                "parameters": {}
            }
        text_lower = text.lower()
        
        # Oddiy keyword matching
        intents = {
            'CREATE_RECURRING_TASK': [
                'takrorlanuvchi topshiriq',
                'muntazam topshiriq',
                'takroriy topshiriq',
                'har kuni topshiriq',
                'har hafta topshiriq',
                'har oy topshiriq',
                'recurring task',
            ],
            'EXPORT_ANALYTICS': [
                'analitika fayl',
                'analitika export',
                'analytics export',
                'diagramma fayl',
                'hisobot fayl',
                'xlsx',
                'pdf',
            ],
            'ANALYTICS_QUERY': [
                'analitika',
                'statistika',
                'ko‘rsatkich',
                'ko`rsatkich',
                'grafik',
                'diagramma',
                'tahlil',
            ],
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
                    params = self._extract_parameters(text, intent)
                    confidence = 0.8

                    # Task buyruqlari uchun AI bilan parametrlarni boyitish
                    if prefer_ai and intent in {'CREATE_TASK', 'CREATE_RECURRING_TASK'}:
                        ai_result = self._infer_task_intent_with_ai(text, user=user)
                        ai_intent = ai_result.get('intent')
                        ai_conf = float(ai_result.get('confidence', 0.0) or 0.0)
                        ai_params = ai_result.get('parameters') or {}

                        if ai_intent in {'CREATE_TASK', 'CREATE_RECURRING_TASK'}:
                            intent = ai_intent
                            params = self._merge_task_params(params, ai_params)
                            confidence = max(confidence, ai_conf)

                    return {
                        "intent": intent,
                        "confidence": confidence,
                        "parameters": params
                    }

        # Audio transkripsiya matnlarida keyword bo'lmasa ham topshiriq bo'lishi mumkin
        if prefer_ai and self._is_likely_task_command(text_lower):
            ai_result = self._infer_task_intent_with_ai(text, user=user)
            if ai_result.get('intent') in {'CREATE_TASK', 'CREATE_RECURRING_TASK'}:
                ai_conf = float(ai_result.get('confidence', 0.0) or 0.0)
                if ai_conf >= 0.55:
                    return ai_result

        return {
            "intent": "UNKNOWN",
            "confidence": 0.0,
            "parameters": {}
        }

    def _is_likely_task_command(self, text_lower: str) -> bool:
        """Matn buyruq-topshiriqqa o'xshaydimi."""
        action_patterns = [
            r'\bbajar(?:ilsin|ish|ing|sin|amiz|aylik)?\b',
            r"\bta[`']?minla(?:ng|sin|sh)?\b",
            r'\btekshir(?:ilsin|ing|sin|uv)?\b',
            r'\bnazorat(?:ga)?\s+ol(?:insin|ing)?\b',
            r'\btashkil\s+qil(?:ing|insin)?\b',
            r'\btopshir(?:iq|iqni|ilsin|ing)?\b',
            r'\byubor(?:ilsin|ing)?\b',
            r'\bhal\s+qil(?:ing|insin)?\b',
            r"\bchoralar\s+ko[`']r(?:ing|ilsin)?\b",
            r'\brasmiylashtir(?:ing|ilsin)?\b',
        ]
        query_patterns = [
            r'\bnechta\b',
            r'\bqancha\b',
            r'\bqanday\b',
            r'\bholat\b',
            r'\bstatistika\b',
            r"\bro[`']yxat\b",
            r'\bstatus\b',
        ]
        has_action = any(re.search(pattern, text_lower) for pattern in action_patterns)
        is_query = any(re.search(pattern, text_lower) for pattern in query_patterns)
        return has_action and not is_query

    def _merge_task_params(self, base_params: Dict[str, Any], ai_params: Dict[str, Any]) -> Dict[str, Any]:
        """Regex va AI orqali olingan parametrlarni birlashtirish."""
        merged = dict(base_params or {})
        for key, value in (ai_params or {}).items():
            if value is None:
                continue
            if key in {'title', 'description', 'organization_name'} and isinstance(value, str):
                if value.strip():
                    merged[key] = value.strip()
                continue
            if key in {'organization_ids', 'organization_names'} and isinstance(value, list):
                if value:
                    merged[key] = value
                continue
            if key == 'assign_all' and value is True:
                merged[key] = True
                continue
            if key == 'confidence':
                continue
            if value != "":
                merged[key] = value
        return merged

    def _extract_json_object(self, raw_text: str) -> Dict[str, Any]:
        """LLM javobidan JSON obyektni xavfsiz ajratib olish."""
        if not raw_text:
            return {}
        try:
            parsed = json.loads(raw_text)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if not match:
            return {}

        try:
            parsed = json.loads(match.group())
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def _infer_task_intent_with_ai(self, text: str, user: Any = None) -> Dict[str, Any]:
        """
        LLM yordamida topshiriq yaratish intentini aniqlash va parametrlarni to'ldirish.
        """
        client = self.get_client()
        if not client:
            return {"intent": "UNKNOWN", "confidence": 0.0, "parameters": {}}

        from organizations.models import Organization
        orgs = list(
            Organization.objects.filter(is_active=True)
            .values('id', 'name', 'sector__name')
        )
        org_map = {str(o['id']): o for o in orgs}
        org_list = "\n".join(
            f"- {o['name']} (ID: {o['id']}, soha: {o.get('sector__name') or 'Noma`lum'})"
            for o in orgs
        ) or "- Tashkilotlar mavjud emas"

        prompt = f"""
Foydalanuvchi yuborgan matn (ko'pincha audio transkripsiya):
\"\"\"{text}\"\"\"

Mavjud tashkilotlar:
{org_list}

Vazifa:
1) Bu matn topshiriq yaratish buyrug'imi, aniqlang.
2) Agar topshiriq bo'lsa, maydonlarni to'ldiring.
3) Agar takrorlanuvchi topshiriq bo'lsa, intentni CREATE_RECURRING_TASK qiling.

Faqat JSON qaytaring:
{{
  "intent": "CREATE_TASK|CREATE_RECURRING_TASK|UNKNOWN",
  "confidence": 0.0,
  "title": "",
  "description": "",
  "priority": "PAST|ODDIY|YUQORI|FAVQULODDA",
  "category": "IJTIMOIY|IQTISODIY|HUQUQIY|INFRASTRUKTURA|TA_LIM|SOG_LIQNI_SAQLASH|BOSHQA",
  "deadline_days": 5,
  "organization_ids": ["UUID"],
  "organization_names": ["nomlar"],
  "assign_all": false,
  "frequency": "DAILY|WEEKLY|BIWEEKLY|MONTHLY|QUARTERLY|YEARLY|CUSTOM|null",
  "start_date": "YYYY-MM-DD|null",
  "end_date": "YYYY-MM-DD|null"
}}
"""

        try:
            if self.provider == 'openai':
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "Sen hokimlik uchun topshiriq buyruqlarini aniqlovchi tizimsan. "
                                "Faqat JSON qaytar."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )
                raw = response.choices[0].message.content or "{}"
            elif self.provider == 'anthropic':
                response = client.messages.create(
                    model=self.model,
                    max_tokens=1200,
                    messages=[{"role": "user", "content": prompt}],  # type: ignore[list-item]
                )
                raw = getattr(response.content[0], 'text', '{}')
            else:
                return {"intent": "UNKNOWN", "confidence": 0.0, "parameters": {}}

            parsed = self._extract_json_object(str(raw))
            intent = str(parsed.get('intent', 'UNKNOWN')).upper()
            if intent not in {'CREATE_TASK', 'CREATE_RECURRING_TASK', 'UNKNOWN'}:
                intent = 'UNKNOWN'

            try:
                confidence = float(parsed.get('confidence', 0.0) or 0.0)
            except (TypeError, ValueError):
                confidence = 0.0
            confidence = max(0.0, min(1.0, confidence))

            allowed_priorities = {'PAST', 'ODDIY', 'YUQORI', 'FAVQULODDA'}
            allowed_categories = {
                'IJTIMOIY', 'IQTISODIY', 'HUQUQIY', 'INFRASTRUKTURA',
                'TA_LIM', 'SOG_LIQNI_SAQLASH', 'BOSHQA'
            }
            allowed_freq = {'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'}

            org_ids: List[str] = []
            for oid in parsed.get('organization_ids', []) or []:
                if str(oid) in org_map:
                    org_ids.append(str(oid))

            org_names = [str(name).strip() for name in (parsed.get('organization_names') or []) if str(name).strip()]
            if not org_ids and org_names:
                for org in orgs:
                    org_name_lower = (org.get('name') or '').lower()
                    if any(name.lower() in org_name_lower or org_name_lower in name.lower() for name in org_names):
                        org_ids.append(str(org['id']))

            params: Dict[str, Any] = {
                'title': str(parsed.get('title', '')).strip(),
                'description': str(parsed.get('description', '')).strip(),
                'priority': str(parsed.get('priority', 'ODDIY')).upper(),
                'category': str(parsed.get('category', 'BOSHQA')).upper(),
                'organization_ids': list(dict.fromkeys(org_ids)),
                'organization_names': org_names,
                'assign_all': bool(parsed.get('assign_all', False)),
            }

            try:
                params['deadline_days'] = int(parsed.get('deadline_days', 5) or 5)
            except (TypeError, ValueError):
                params['deadline_days'] = 5

            frequency_raw = parsed.get('frequency')
            frequency = str(frequency_raw).upper() if frequency_raw else None
            if frequency in allowed_freq:
                params['frequency'] = frequency

            for date_key in ('start_date', 'end_date'):
                date_value = parsed.get(date_key)
                if isinstance(date_value, str) and re.match(r'^\d{4}-\d{2}-\d{2}$', date_value):
                    params[date_key] = date_value

            if params['priority'] not in allowed_priorities:
                params['priority'] = 'ODDIY'
            if params['category'] not in allowed_categories:
                params['category'] = 'BOSHQA'
            params['deadline_days'] = min(max(params['deadline_days'], 1), 365)

            if intent == 'CREATE_TASK' and params.get('frequency') in {'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'}:
                intent = 'CREATE_RECURRING_TASK'

            if intent == 'CREATE_RECURRING_TASK' and 'frequency' not in params:
                params['frequency'] = 'WEEKLY'

            return {
                'intent': intent,
                'confidence': confidence,
                'parameters': params,
            }
        except Exception as e:
            logger.error(f"Task intent AI tahlil xatosi: {e}")
            return {"intent": "UNKNOWN", "confidence": 0.0, "parameters": {}}
    
    def _extract_parameters(self, text: str, intent: str) -> Dict:
        """Matndan parametrlarni ajratib olish"""
        params = {}
        normalized_text = (text or "").strip()
        
        # Raqamlarni topish (topshiriq/murojaat ID)
        import re
        numbers = re.findall(r'#?(\d+)', normalized_text)
        if numbers:
            params['id'] = int(numbers[0])
        
        # Tashkilot nomini topish
        org_patterns = [
            r'(?:ga|ning)\s+(.+?)(?:\s+ga|\s+ni|\s*$)',
        ]
        for pattern in org_patterns:
            match = re.search(pattern, normalized_text, re.IGNORECASE)
            if match:
                params['organization_name'] = match.group(1).strip()
                break

        matched_orgs = self._match_org_ids_from_text(normalized_text)
        if matched_orgs:
            params['organization_ids'] = [item['id'] for item in matched_orgs]
            params['organization_names'] = [item['name'] for item in matched_orgs]
        
        # Muddat
        deadline_patterns = {
            r'(\d+)\s*soat': 'hours',
            r'(\d+)\s*kun': 'days',
            r'(\d+)\s*hafta': 'weeks',
            r'(\d+)\s*oy': 'months',
        }
        for pattern, unit in deadline_patterns.items():
            match = re.search(pattern, normalized_text, re.IGNORECASE)
            if match:
                params['deadline'] = {
                    'value': int(match.group(1)),
                    'unit': unit
                }
                value = int(match.group(1))
                if unit == 'hours':
                    params['deadline_days'] = max(1, (value + 23) // 24)
                elif unit == 'days':
                    params['deadline_days'] = value
                elif unit == 'weeks':
                    params['deadline_days'] = value * 7
                elif unit == 'months':
                    params['deadline_days'] = value * 30
                break

        if 'deadline_days' not in params:
            if re.search(r'\b(ertaga|ertasiga|tomorrow)\b', normalized_text, re.IGNORECASE):
                params['deadline_days'] = 1
            elif re.search(r'\b(indin|indinga|2\s*kundan\s*keyin)\b', normalized_text, re.IGNORECASE):
                params['deadline_days'] = 2
            elif re.search(r'\bbugun\b', normalized_text, re.IGNORECASE):
                params['deadline_days'] = 1

        def parse_date(date_text: str) -> str | None:
            date_text = date_text.strip()
            for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
                try:
                    return datetime.strptime(date_text, fmt).date().isoformat()
                except ValueError:
                    continue
            return None

        guessed_priority = self._guess_priority_from_text(normalized_text)
        if guessed_priority:
            params['priority'] = guessed_priority

        if intent == 'CREATE_TASK':
            # Topshiriq nomi
            title_patterns = [
                r'topshiriq\s+nomi\s*[:\-]?\s*(.+?)(?=\s+(topshiriq\s+tavsifi|tavsif|muddat|barchaga|hamma|$))',
                r'sarlavha\s*[:\-]?\s*(.+?)(?=\s+(tavsif|muddat|barchaga|hamma|$))',
            ]
            for pattern in title_patterns:
                match = re.search(pattern, normalized_text, re.IGNORECASE)
                if match:
                    params['title'] = match.group(1).strip()
                    break

            # Topshiriq tavsifi
            description_patterns = [
                r'topshiriq\s+tavsifi\s*[:\-]?\s*(.+?)(?=\s+(muddat|barchaga|hamma|$))',
                r'tavsif\s*[:\-]?\s*(.+?)(?=\s+(muddat|barchaga|hamma|$))',
            ]
            for pattern in description_patterns:
                match = re.search(pattern, normalized_text, re.IGNORECASE)
                if match:
                    params['description'] = match.group(1).strip()
                    break

            # Barchaga tayinlash
            if re.search(r'\b(barchaga|hamma|hammasiga)\b', normalized_text, re.IGNORECASE):
                params['assign_all'] = True

            # Fallback maydonlar
            if not params.get('description'):
                params['description'] = normalized_text
            if not params.get('title'):
                params['title'] = self._build_task_title(normalized_text)
            if not params.get('deadline_days'):
                priority = params.get('priority', 'ODDIY')
                params['deadline_days'] = self._default_deadline_days_for_priority(priority)
            if not params.get('organization_ids') and params.get('organization_name'):
                params['organization_names'] = [params['organization_name']]

        if intent == 'CREATE_RECURRING_TASK':
            # Title
            title_patterns = [
                r'takrorlanuvchi\s+topshiriq\s+nomi\s*[:\-]?\s*(.+?)(?=\s+(tavsif|takror|muddat|boshlanish|tugash|$))',
                r'sarlavha\s*[:\-]?\s*(.+?)(?=\s+(tavsif|takror|muddat|boshlanish|tugash|$))',
            ]
            for pattern in title_patterns:
                match = re.search(pattern, normalized_text, re.IGNORECASE)
                if match:
                    params['title'] = match.group(1).strip()
                    break

            # Description
            description_patterns = [
                r'tavsif\s*[:\-]?\s*(.+?)(?=\s+(takror|muddat|boshlanish|tugash|$))',
                r'izoh\s*[:\-]?\s*(.+?)(?=\s+(takror|muddat|boshlanish|tugash|$))',
            ]
            for pattern in description_patterns:
                match = re.search(pattern, normalized_text, re.IGNORECASE)
                if match:
                    params['description'] = match.group(1).strip()
                    break

            # Frequency
            if re.search(r'ikki\s*hafta|2\s*hafta', normalized_text, re.IGNORECASE):
                params['frequency'] = 'BIWEEKLY'
            elif re.search(r'har\s*kuni|kunlik', normalized_text, re.IGNORECASE):
                params['frequency'] = 'DAILY'
            elif re.search(r'har\s*hafta|haftalik', normalized_text, re.IGNORECASE):
                params['frequency'] = 'WEEKLY'
            elif re.search(r'har\s*oy|oylik', normalized_text, re.IGNORECASE):
                params['frequency'] = 'MONTHLY'
            elif re.search(r'har\s*chorak|choraklik', normalized_text, re.IGNORECASE):
                params['frequency'] = 'QUARTERLY'
            elif re.search(r'har\s*yil|yillik', normalized_text, re.IGNORECASE):
                params['frequency'] = 'YEARLY'

            cron_match = re.search(r'cron\s*[:\-]?\s*([\w\s*/,-]+)', normalized_text, re.IGNORECASE)
            if cron_match:
                params['frequency'] = 'CUSTOM'
                params['cron_expression'] = cron_match.group(1).strip()

            # Start/end dates
            start_match = re.search(r'(?:boshlanish|boshlanadi|start)\s*[:\-]?\s*([0-9./-]+)', normalized_text, re.IGNORECASE)
            if start_match:
                parsed = parse_date(start_match.group(1))
                if parsed:
                    params['start_date'] = parsed

            end_match = re.search(r'(?:tugash|yakun|end|gacha)\s*[:\-]?\s*([0-9./-]+)', normalized_text, re.IGNORECASE)
            if end_match:
                parsed = parse_date(end_match.group(1))
                if parsed:
                    params['end_date'] = parsed

            if re.search(r'\b(barchaga|hamma|hammasiga)\b', normalized_text, re.IGNORECASE):
                params['assign_all'] = True

            if not params.get('title'):
                params['title'] = self._build_task_title(normalized_text)
            if not params.get('description'):
                params['description'] = normalized_text
            if not params.get('deadline_days'):
                priority = params.get('priority', 'ODDIY')
                params['deadline_days'] = self._default_deadline_days_for_priority(priority)

        if intent == 'EXPORT_ANALYTICS':
            if re.search(r'\bpdf\b', text, re.IGNORECASE):
                params['format'] = 'pdf'
            elif re.search(r'\b(xlsx|excel)\b', text, re.IGNORECASE):
                params['format'] = 'xlsx'
            if 'format' not in params:
                params['format'] = 'xlsx'

        if intent == 'ANALYTICS_QUERY':
            scopes = set()
            if re.search(r'\btashkilot\b', text, re.IGNORECASE):
                scopes.add('organizations')
            if re.search(r'\btopshiriq\b|\bvazifa\b', text, re.IGNORECASE):
                scopes.add('tasks')
            if re.search(r'\bmurojaat\b|\bappeal\b', text, re.IGNORECASE):
                scopes.add('appeals')
            if re.search(r'\bfoydalanuvchi\b|\bxodim\b|\bkadr\b', text, re.IGNORECASE):
                scopes.add('users')
            if scopes:
                params['scopes'] = list(scopes)

            period_match = re.search(r'oxirgi\s+(\d+)\s*(kun|hafta|oy|yil)', text, re.IGNORECASE)
            if period_match:
                value = int(period_match.group(1))
                unit = period_match.group(2).lower()
                if unit == 'kun':
                    params['period_days'] = value
                elif unit == 'hafta':
                    params['period_days'] = value * 7
                elif unit == 'oy':
                    params['period_days'] = value * 30
                elif unit == 'yil':
                    params['period_days'] = value * 365

        if intent == 'GENERATE_REPORT':
            if re.search(r'\bhaftalik\b', text, re.IGNORECASE):
                params['report_type'] = 'WEEKLY_SUMMARY'
                params['period_days'] = 7
            elif re.search(r'\boylik\b', text, re.IGNORECASE):
                params['report_type'] = 'MONTHLY_SUMMARY'
                params['period_days'] = 30
            elif re.search(r'\bkunlik\b', text, re.IGNORECASE):
                params['report_type'] = 'DAILY_SUMMARY'
                params['period_days'] = 1
            else:
                if 'period_days' not in params:
                    params['period_days'] = 7
                if 'report_type' not in params:
                    params['report_type'] = 'WEEKLY_SUMMARY'
        
        return params

    def _default_deadline_days_for_priority(self, priority: str) -> int:
        priority_map = {
            'FAVQULODDA': 1,
            'YUQORI': 3,
            'ODDIY': 5,
            'PAST': 7,
        }
        return priority_map.get(str(priority).upper(), 5)

    def _guess_priority_from_text(self, text: str) -> str | None:
        text_lower = text.lower()
        if re.search(r'\b(shoshilinch|zudlik bilan|tezkor|favqulodda|darhol)\b', text_lower):
            return 'FAVQULODDA'
        if re.search(r'\b(muhim|kechiktirmay|zarur|ustuvor)\b', text_lower):
            return 'YUQORI'
        if re.search(r'\b(shoshilinch emas|oddiy|odatiy)\b', text_lower):
            return 'ODDIY'
        if re.search(r'\b(shart emas|ikkinchi daraja|past)\b', text_lower):
            return 'PAST'
        return None

    def _build_task_title(self, text: str) -> str:
        cleaned = re.sub(r'\s+', ' ', text).strip(" \n\t-:;,.")
        if not cleaned:
            return 'AI tomonidan yaratilgan topshiriq'

        # Birinchi jumladan sarlavha yasash
        sentence = re.split(r'[.!?\n]', cleaned)[0].strip()
        sentence = re.sub(r'^(iltimos[, ]+)?', '', sentence, flags=re.IGNORECASE)
        if len(sentence) > 120:
            sentence = sentence[:117].rstrip() + "..."
        return sentence or 'AI tomonidan yaratilgan topshiriq'

    def _match_org_ids_from_text(self, text: str) -> List[Dict[str, str]]:
        """Matndan tashkilot nomlarini topish (oddiy fuzzy matching)."""
        from organizations.models import Organization

        normalized = (text or '').lower()
        if not normalized:
            return []

        results: List[Dict[str, str]] = []
        orgs = Organization.objects.filter(is_active=True).values('id', 'name')

        for org in orgs:
            org_name = str(org.get('name') or '')
            org_name_lower = org_name.lower()
            if not org_name_lower:
                continue

            # To'liq yoki asosiy tokenlar bo'yicha moslik
            if org_name_lower in normalized:
                results.append({'id': str(org['id']), 'name': org_name})
                continue

            tokens = [tok for tok in re.split(r'[^a-z0-9а-яёўқғҳ]+', org_name_lower) if len(tok) >= 4]
            if tokens and sum(1 for token in tokens if token in normalized) >= max(1, len(tokens) // 2):
                results.append({'id': str(org['id']), 'name': org_name})

        # Dublikatlarni olib tashlash
        unique: Dict[str, Dict[str, str]] = {}
        for item in results:
            unique[item['id']] = item
        return list(unique.values())[:5]
    
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
            elif action_type == 'CREATE_RECURRING_TASK':
                result = self._create_recurring_task(params, action.initiated_by)
            elif action_type == 'EXPORT_ANALYTICS':
                result = self._export_analytics(params)
                
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
            elif action_type in {
                'STATUS_CHECK',
                'ORGANIZATION_STATUS',
                'USERS_STATUS',
                'APPEALS_STATUS',
                'TASKS_STATUS',
                'NOTIFICATIONS_STATUS',
                'TELEGRAM_STATUS',
                'LIST_ORGANIZATIONS',
                'LIST_USERS',
                'ANALYTICS_QUERY',
            }:
                message = self.handle_query(action_type, params, action.initiated_by)
                result = {'success': True, 'message': message}
                
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

        if intent == 'ANALYTICS_QUERY':
            scopes = params.get('scopes') or ['tasks', 'appeals', 'users', 'organizations']
            period_days = params.get('period_days')
            if period_days:
                end_date = timezone.now().date()
                start_date = end_date - timedelta(days=period_days)
                task_qs = Task.objects.filter(created_at__date__gte=start_date)
                appeal_qs = TelegramAppeal.objects.filter(created_at__date__gte=start_date)
            else:
                task_qs = Task.objects.all()
                appeal_qs = TelegramAppeal.objects.all()

            parts = []
            if period_days:
                parts.append(f"Davr: oxirgi {period_days} kun")

            if 'tasks' in scopes:
                parts.append(
                    "Topshiriqlar:\n"
                    f"- Jami: {task_qs.count()}\n"
                    f"- Faol: {task_qs.filter(status__in=['YANGI', 'IJRODA']).count()}\n"
                    f"- Muddati o'tgan: {task_qs.filter(status='MUDDATI_KECH').count()}\n"
                    f"- Bajarilgan: {task_qs.filter(status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI']).count()}"
                )

            if 'appeals' in scopes:
                parts.append(
                    "Murojaatlar:\n"
                    f"- Jami: {appeal_qs.count()}\n"
                    f"- Ko'rib chiqilmagan: {appeal_qs.filter(status__in=['pending_ai', 'pending_review']).count()}\n"
                    f"- Hal etilgan: {appeal_qs.filter(status='resolved').count()}"
                )

            if 'users' in scopes:
                total_users = User.objects.count()
                active_users = User.objects.filter(status='FAOL').count() if hasattr(User, 'status') else total_users
                parts.append(
                    "Foydalanuvchilar:\n"
                    f"- Jami: {total_users}\n"
                    f"- Faol: {active_users}"
                )

            if 'organizations' in scopes:
                org_total = Organization.objects.filter(is_active=True).count()
                parts.append(
                    "Tashkilotlar:\n"
                    f"- Jami: {org_total}\n"
                    f"- Faol: {org_total}"
                )

            return "\n\n".join(parts) if parts else "Analitika topilmadi."

        return "So'rov tushunilmadi."
    
    def _create_task(self, params: Dict, user) -> Dict:
        """Topshiriq yaratish"""
        from tasks.models import Task, TaskOrganization
        from organizations.models import Organization

        title = str(params.get('title') or 'AI tomonidan yaratilgan topshiriq').strip()
        description = str(params.get('description') or '').strip()
        if not description:
            description = title

        priority = str(params.get('priority', 'ODDIY')).upper()
        if priority not in {'PAST', 'ODDIY', 'YUQORI', 'FAVQULODDA'}:
            priority = 'ODDIY'

        category = str(params.get('category', 'BOSHQA')).upper()
        allowed_categories = {
            'IJTIMOIY', 'IQTISODIY', 'HUQUQIY', 'INFRASTRUKTURA',
            'TA_LIM', 'SOG_LIQNI_SAQLASH', 'BOSHQA'
        }
        if category not in allowed_categories:
            category = 'BOSHQA'

        try:
            deadline_days = int(params.get('deadline_days', self._default_deadline_days_for_priority(priority)) or 5)
        except (TypeError, ValueError):
            deadline_days = self._default_deadline_days_for_priority(priority)
        deadline_days = min(max(deadline_days, 1), 365)

        org_ids = [str(oid) for oid in (params.get('organization_ids') or []) if oid]
        org_names = [str(name).strip() for name in (params.get('organization_names') or []) if str(name).strip()]
        org_name = str(params.get('organization_name') or '').strip()
        assign_all = bool(params.get('assign_all', False))

        if assign_all:
            org_ids = list(
                Organization.objects.filter(is_active=True).values_list('id', flat=True)
            )
            org_ids = [str(oid) for oid in org_ids]

        if not org_ids and org_names:
            matched = Organization.objects.filter(
                is_active=True,
                name__iregex='|'.join(re.escape(name) for name in org_names[:10])
            ).values_list('id', flat=True)
            org_ids = [str(oid) for oid in matched]

        if not org_ids and org_name:
            org_ids = [
                str(oid) for oid in
                Organization.objects.filter(name__icontains=org_name, is_active=True).values_list('id', flat=True)
            ]

        if not org_ids:
            text_for_match = f"{title} {description}".strip()
            guessed = self._match_org_ids_from_text(text_for_match)
            org_ids = [item['id'] for item in guessed]

        valid_orgs = list(Organization.objects.filter(id__in=org_ids, is_active=True))
        if not valid_orgs:
            return {
                'success': False,
                'error': "Topshiriq uchun mos tashkilot aniqlanmadi. Tashkilot nomini aniqroq ayting."
            }

        task = Task.objects.create(
            title=title,
            description=description,
            priority=priority,
            category=category,
            deadline=timezone.now() + timedelta(days=deadline_days),
            created_by=user,
            source='AI'
        )

        for org in valid_orgs:
            TaskOrganization.objects.create(task=task, organization=org)

        task_id = str(task.id)
        return {
            'success': True,
            'task_id': task_id,
            'message': f"Topshiriq #{task_id} yaratildi ({len(valid_orgs)} ta tashkilotga biriktirildi)"
        }

    def _create_recurring_task(self, params: Dict, user) -> Dict:
        """Takrorlanuvchi topshiriq yaratish"""
        from tasks.models import RecurringTask
        from organizations.models import Organization

        title = params.get('title', 'Takrorlanuvchi topshiriq')
        description = params.get('description', title)
        frequency = params.get('frequency', 'MONTHLY')
        cron_expression = params.get('cron_expression', '')
        priority = params.get('priority', 'ODDIY')
        deadline_days = params.get('deadline_days', 7)
        assign_all = params.get('assign_all', False)
        org_ids = params.get('organization_ids', [])
        org_name = params.get('organization_name')

        start_date = params.get('start_date')
        end_date = params.get('end_date')

        if frequency == 'CUSTOM' and not cron_expression:
            return {
                'success': False,
                'error': "CUSTOM takrorlanish uchun cron ifodasi kerak"
            }

        if not start_date:
            start_date = timezone.now().date().isoformat()

        recurring = RecurringTask.objects.create(
            title=title,
            description=description,
            frequency=frequency,
            cron_expression=cron_expression,
            start_date=start_date,
            end_date=end_date or None,
            priority=priority,
            deadline_days=deadline_days,
            created_by=user,
        )

        if assign_all:
            org_ids = list(Organization.objects.values_list('id', flat=True))
        elif not org_ids and org_name:
            org_ids = list(
                Organization.objects.filter(name__icontains=org_name).values_list('id', flat=True)
            )

        if org_ids:
            recurring.organizations.set(org_ids)

        recurring.calculate_next_run()

        return {
            'success': True,
            'recurring_id': str(recurring.id),
            'message': f"Takrorlanuvchi topshiriq #{recurring.id} yaratildi"
        }

    def _export_analytics(self, params: Dict) -> Dict:
        """Analitika faylini yaratish (download link)."""
        export_format = params.get('format', 'xlsx')
        if export_format not in ['xlsx', 'pdf']:
            export_format = 'xlsx'

        download_url = f"/api/analytics/export/?format={export_format}"

        return {
            'success': True,
            'message': f"Analitika fayli tayyor. Yuklab olish: {download_url}",
            'download_url': download_url,
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
        """Hisobot yaratish - Professional va Creative"""
        from core.models import AIReport
        from tasks.models import Task
        from telegram_bot.models import TelegramAppeal
        from organizations.models import Organization
        from django.db.models import Avg, F, ExpressionWrapper, DurationField
        from django.db.models.functions import TruncDate
        
        report_type = params.get('report_type', 'DAILY_SUMMARY')
        period_days = params.get('period_days', 7)
        
        # Davr bo'yicha period_days ni sozlash
        if report_type == 'DAILY_SUMMARY':
            period_days = 1
        elif report_type == 'WEEKLY_SUMMARY':
            period_days = 7
        elif report_type == 'MONTHLY_SUMMARY':
            period_days = 30
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=period_days)
        
        # Ma'lumotlarni yig'ish
        tasks = Task.objects.filter(created_at__date__gte=start_date)
        appeals = TelegramAppeal.objects.filter(created_at__date__gte=start_date)
        
        # Oldingi davr bilan taqqoslash uchun
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date - timedelta(days=1)
        prev_tasks = Task.objects.filter(created_at__date__gte=prev_start, created_at__date__lte=prev_end)
        prev_appeals = TelegramAppeal.objects.filter(created_at__date__gte=prev_start, created_at__date__lte=prev_end)

        task_status_labels = {
            'YANGI': 'Yangi',
            'IJRODA': 'Ijroda',
            'BAJARILDI': 'Bajarildi',
            'MUDDATI_KECH': "Muddati o'tgan",
            'NAZORATDAN_YECHILDI': 'Nazoratdan yechildi',
            'QAYTA_IJROGA_YUBORILDI': 'Qayta ijroga yuborildi',
            'BAJARILMADI': 'Bajarilmadi',
        }
        task_priority_labels = {
            'FAVQULODDA': 'Favqulodda',
            'YUQORI': 'Yuqori',
            'ODDIY': 'Oddiy',
            'PAST': 'Past',
        }
        appeal_status_labels = {
            'pending_ai': "Ko'rib chiqilmagan (AI)",
            'pending_review': "Ko'rib chiqilmagan",
            'resolved': 'Hal etilgan',
            'rejected': 'Rad etilgan',
        }

        task_status_counts = tasks.values('status').annotate(count=Count('id'))
        task_priority_counts = tasks.values('priority').annotate(count=Count('id'))
        appeal_status_counts = appeals.values('status').annotate(count=Count('id'))
        
        # Tashkilotlar bo'yicha statistika
        org_stats = tasks.values('assigned_organizations__organization__name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Kunlik trend (oxirgi 7 kun)
        daily_trend = tasks.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(count=Count('id')).order_by('date')
        
        # Bajarilgan topshiriqlar
        completed_tasks = tasks.filter(status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI'])
        overdue_tasks = tasks.filter(status='MUDDATI_KECH')
        in_progress_tasks = tasks.filter(status='IJRODA')
        
        # Murojaatlar statistikasi
        resolved_appeals = appeals.filter(status='resolved')
        rejected_appeals = appeals.filter(status='rejected')
        
        # Samaradorlik hisoblash
        total_tasks = tasks.count()
        completed_count = completed_tasks.count()
        completion_rate = round((completed_count / total_tasks * 100) if total_tasks > 0 else 0, 1)
        
        total_appeals_count = appeals.count()
        resolved_count = resolved_appeals.count()
        resolution_rate = round((resolved_count / total_appeals_count * 100) if total_appeals_count > 0 else 0, 1)
        
        # O'sish/pasayish foizi
        prev_tasks_count = prev_tasks.count()
        prev_appeals_count = prev_appeals.count()
        
        task_growth = round(((total_tasks - prev_tasks_count) / prev_tasks_count * 100) if prev_tasks_count > 0 else 0, 1)
        appeal_growth = round(((total_appeals_count - prev_appeals_count) / prev_appeals_count * 100) if prev_appeals_count > 0 else 0, 1)

        content = {
            'tasks': {
                'total': total_tasks,
                'by_status': {
                    task_status_labels.get(item['status'], item['status']): item['count']
                    for item in task_status_counts
                },
                'by_priority': {
                    task_priority_labels.get(item['priority'], item['priority']): item['count']
                    for item in task_priority_counts
                },
                'completed': completed_count,
                'overdue': overdue_tasks.count(),
                'in_progress': in_progress_tasks.count(),
                'completion_rate': completion_rate,
                'growth_percent': task_growth,
            },
            'appeals': {
                'total': total_appeals_count,
                'by_status': {
                    appeal_status_labels.get(item['status'], item['status']): item['count']
                    for item in appeal_status_counts
                },
                'resolved': resolved_count,
                'rejected': rejected_appeals.count(),
                'resolution_rate': resolution_rate,
                'growth_percent': appeal_growth,
            },
            'organizations': {
                'top_performers': [
                    {'name': item['assigned_organizations__organization__name'] or 'Belgilanmagan', 'count': item['count']}
                    for item in org_stats if item['assigned_organizations__organization__name']
                ][:5],
            },
            'trends': {
                'daily': [
                    {'date': item['date'].strftime('%d.%m') if item['date'] else '', 'count': item['count']}
                    for item in daily_trend
                ][-7:],
            },
            'period': {
                'start': start_date.strftime('%d.%m.%Y'),
                'end': end_date.strftime('%d.%m.%Y'),
                'days': period_days,
            },
            'comparison': {
                'prev_tasks': prev_tasks_count,
                'prev_appeals': prev_appeals_count,
                'task_change': task_growth,
                'appeal_change': appeal_growth,
            }
        }
        
        # AI bilan summary yaratish
        summary = self._generate_summary(content, report_type)
        
        # Professional sarlavhalar
        TITLE_TEMPLATES = {
            'DAILY_SUMMARY': f"Kunlik Hisobot - {end_date.strftime('%d.%m.%Y')}",
            'WEEKLY_SUMMARY': f"Haftalik Hisobot - {start_date.strftime('%d.%m')} — {end_date.strftime('%d.%m.%Y')}",
            'MONTHLY_SUMMARY': f"Oylik Hisobot - {end_date.strftime('%B %Y')}",
            'TASK_ANALYSIS': f"Topshiriqlar Tahlili - {end_date.strftime('%d.%m.%Y')}",
            'CUSTOM': f"Maxsus Hisobot - {end_date.strftime('%d.%m.%Y')}"
        }
        title = TITLE_TEMPLATES.get(report_type, f"Hisobot - {end_date}")
        
        # Hisobotni saqlash
        report = AIReport.objects.create(
            report_type=report_type,
            title=title,
            summary=summary,
            content=content,
            period_start=start_date,
            period_end=end_date,
            requested_by=user,
            conversation=conversation
        )
        
        return {
            'success': True,
            'report_id': str(report.id),
            'summary': summary,
            'message': 'Hisobot yaratildi',
            'download_url': f"/api/ai/reports/{report.id}/download/"
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
        openai_client = None

        # Chat provider Anthropic bo'lsa ham transkripsiya uchun OpenAI kalitidan foydalanamiz
        if self.provider == 'openai':
            openai_client = client
        else:
            openai_api_key = getattr(settings, 'OPENAI_API_KEY', os.getenv('OPENAI_API_KEY', ''))
            if openai_api_key:
                try:
                    from openai import OpenAI
                    openai_client = OpenAI(api_key=openai_api_key)
                except Exception as e:
                    logger.error(f"OpenAI transcription client xatosi: {e}")

        if not openai_client:
            return "Audio transkripsiya uchun OpenAI API kaliti topilmadi"

        try:
            try:
                audio_file.seek(0)
            except Exception:
                try:
                    audio_file.file.seek(0)
                except Exception:
                    pass

            file_name = getattr(audio_file, 'name', 'audio.webm') or 'audio.webm'
            file_bytes = audio_file.read() if hasattr(audio_file, 'read') else b''
            if not file_bytes and hasattr(audio_file, 'file'):
                file_bytes = audio_file.file.read()

            if not file_bytes:
                return "Xatolik: Audio fayl bo'sh"

            # OpenAI SDK file-like obyektni yaxshi qabul qiladi
            file_obj = io.BytesIO(file_bytes)
            file_obj.name = file_name

            transcription_params: Dict[str, Any] = {
                "model": "whisper-1",
                "file": file_obj,
            }

            language = getattr(settings, "AI_TRANSCRIPTION_LANGUAGE", "auto")
            if language and language != "auto":
                transcription_params["language"] = language

            transcription = openai_client.audio.transcriptions.create(
                **transcription_params,
                prompt="Transcribe in Uzbek (Latin). If unclear, keep proper names as is."
            )

            text = (getattr(transcription, 'text', '') or '').strip()
            if not text:
                return "Xatolik: Audio transkripsiya bo'sh qaytdi"

            # Keyingi saqlash/yuborishlar uchun pointerni tiklaymiz
            try:
                audio_file.seek(0)
            except Exception:
                try:
                    audio_file.file.seek(0)
                except Exception:
                    pass

            return text
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
