"""
AI xizmati - Murojaatlarni tahlil qilish
OpenAI yoki Anthropic API yordamida

Bu modul core.ai_service bilan integratsiya qilingan.
Markazlashgan AI tizimidan foydalanadi.
"""

import logging
import json
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def analyze_appeal(appeal, settings) -> Dict[str, Any]:
    """
    Murojaatni AI orqali tahlil qilish
    
    Args:
        appeal: TelegramAppeal ob'ekti
        settings: BotSettings ob'ekti
    
    Returns:
        {
            'analysis': str - Tahlil natijasi
            'score': int - 0-100 ball
            'priority': str - low/medium/high/critical
            'is_valid': bool - Haqiqiy murojaatmi
            'reject_reason': str - Rad etish sababi (agar bor bo'lsa)
            'suggested_category': int - Tavsiya etilgan soha ID
        }
    """
    
    # AI o'chirilgan bo'lsa
    if not settings or settings.ai_provider == 'disabled':
        return {
            'analysis': '',
            'score': 100,
            'priority': 'medium',
            'is_valid': True
        }
    
    # Avval tez tekshirish (AI chaqirmasdan)
    quick_check = validate_appeal_content(appeal.text or '')
    if not quick_check['is_valid']:
        return {
            'analysis': quick_check['reason'],
            'score': 20,
            'priority': 'low',
            'is_valid': False,
            'reject_reason': quick_check['reason']
        }
    
    # Markazlashgan AI Service-dan foydalanish
    try:
        from core.ai_service import AIService
        ai_service = AIService()
        
        # AIService analyze_appeal metodidan foydalanish
        result = ai_service.analyze_appeal(appeal)
        
        # Format conversion
        priority_map = {
            'past': 'low',
            'oddiy': 'medium',
            'yuqori': 'high',
            'favqulodda': 'critical'
        }
        
        priority = priority_map.get(result.get('priority', 'oddiy'), 'medium')
        
        # Score calculation based on AI analysis
        score = 100
        if result.get('requires_urgent_attention'):
            score = 85
        if result.get('sentiment') == 'salbiy':
            score = 70
        
        return {
            'analysis': result.get('summary', ''),
            'score': score,
            'priority': priority,
            'is_valid': True,
            'reject_reason': None,
            'category_suggestion': result.get('category'),
            'suggested_response': result.get('suggested_response', ''),
            'suggested_organizations': result.get('suggested_organizations', []),
            'keywords': result.get('keywords', [])
        }
        
    except ImportError:
        # Fallback: core.ai_service mavjud emas
        logger.warning("core.ai_service import qilib bo'lmadi, fallback ishlatilmoqda")
        return analyze_appeal_legacy(appeal, settings)
    except Exception as e:
        logger.error(f"AI tahlilida xato: {e}")
        return analyze_appeal_legacy(appeal, settings)


def analyze_appeal_legacy(appeal, settings) -> Dict[str, Any]:
    """Legacy AI tahlil - to'g'ridan-to'g'ri API chaqirish"""
    
    provider = settings.ai_provider
    api_key = settings.ai_api_key
    model = getattr(settings, 'ai_model', 'gpt-4o-mini')
    
    if not api_key:
        logger.warning("AI API kaliti o'rnatilmagan")
        return {
            'analysis': '',
            'score': 100,
            'priority': 'medium',
            'is_valid': True
        }
    
    # Prompt tayyorlash
    prompt = create_analysis_prompt(appeal)
    
    try:
        if provider == 'openai':
            result = analyze_with_openai(prompt, api_key, model)
        elif provider == 'anthropic':
            result = analyze_with_anthropic(prompt, api_key, model)
        else:
            logger.warning(f"Noma'lum AI provayder: {provider}")
            return {
                'analysis': '',
                'score': 100,
                'priority': 'medium',
                'is_valid': True
            }
        
        return result
        
    except Exception as e:
        logger.error(f"AI tahlilida xato: {e}")
        return {
            'analysis': f'Tahlil qilishda xato: {str(e)}',
            'score': 100,
            'priority': 'medium',
            'is_valid': True
        }


def generate_ai_response_for_appeal(appeal) -> str:
    """
    Murojaat uchun AI tomonidan javob yaratish.
    Admin ko'rib chiqish uchun taklif.
    """
    try:
        from core.ai_service import AIService
        ai_service = AIService()
        return ai_service.generate_appeal_response(appeal)
    except Exception as e:
        logger.error(f"AI response generation error: {e}")
        return f"""Hurmatli fuqaro!

Sizning #{appeal.appeal_number} raqamli murojaatingiz qabul qilindi.
Tez orada ko'rib chiqiladi.

Hurmat bilan,
Hatirchi tuman hokimligi"""


def check_appeal_for_auto_close(appeal) -> Dict[str, Any]:
    """
    Murojaatni avtomatik yopish kerakmi tekshirish.
    """
    try:
        from core.ai_service import AIService
        ai_service = AIService()
        return ai_service.should_auto_close_appeal(appeal)
    except Exception as e:
        logger.error(f"Auto-close check error: {e}")
        return {"should_close": False, "reason": "Xato yuz berdi"}


def get_daily_briefing() -> str:
    """
    Kunlik briefing - Admin uchun.
    """
    try:
        from core.ai_service import AIService
        ai_service = AIService()
        return ai_service.get_daily_summary()
    except Exception as e:
        logger.error(f"Daily briefing error: {e}")
        return "Kunlik hisobot yaratishda xato yuz berdi."


def create_analysis_prompt(appeal) -> str:
    """Tahlil uchun prompt yaratish"""
    
    user = appeal.telegram_user
    appeal_type = appeal.appeal_type
    category = appeal.category
    
    prompt = f"""Siz Hatirchi tumani Hokimiyatiga kelgan fuqaro murojaatini tahlil qiluvchi AI yordamchisisiz.

MUROJAAT MA'LUMOTLARI:
- Raqam: #{appeal.appeal_number}
- Yuboruvchi: {user.full_name}
- Hudud: {user.region.name_uz if user.region else 'Ko\'rsatilmagan'}
- Murojaat turi: {appeal_type.name_uz if appeal_type else 'Ko\'rsatilmagan'}
- Soha: {category.name_uz if category else 'Ko\'rsatilmagan'}
- Matn: {appeal.text}
- Qo'shimcha fayllar: {appeal.attachments.count()} ta

VAZIFALARINGIZ:
1. Murojaatning haqiqiyligini tekshiring (spam, noto'g'ri mazmun, takroriy murojaat emas ekanligini)
2. Muhimlik darajasini aniqlang (low/medium/high/critical)
3. Qisqacha tahlil yozing (100-200 so'z)
4. 0-100 gacha ball bering (murojaat sifati va haqiqiyligi)
5. Rad etish kerak bo'lsa, sababini ko'rsating

QUYIDAGI HOLLARDA MUROJAATNI RAD ETING (ball 30 dan past, is_valid: false):
1. XAQORAT va HAQORATLI SO'ZLAR - har qanday haqorat, so'kinish, tahqirlash
2. MAZMUNI BO'LMAGAN XABARLAR - tasodifiy harflar, rasmlar, tushunarsiz matn
3. SPAM va REKLAMA - mahsulot yoki xizmat reklamasi
4. TAKRORIY/NOANIQ MUROJAATLAR - aniq muammo ko'rsatilmagan
5. SIYOSIY TARG'IBOT - siyosiy partiyalar yoki harakatlar targ'iboti
6. NOQONUNIY KONTENT - noqonuniy faoliyatga chaqirish

JAVOBINGIZNI QUYIDAGI JSON FORMATIDA YUBORING:
{{
    "analysis": "Tahlil matni...",
    "score": 85,
    "priority": "medium",
    "is_valid": true,
    "reject_reason": null,
    "category_suggestion": null
}}

MUHIMLIK DARAJALARI:
- critical: Hayot va sog'liq uchun xavf, favqulodda holatlar
- high: Zudlik bilan hal qilish kerak bo'lgan muammolar
- medium: Oddiy shikoyatlar va takliflar
- low: Umumiy savollar, past ahamiyatli masalalar

DIQQAT:
- Spam, reklama, noaniq murojaatlarni aniqlang
- Haqoratli, noqonuniy kontentni aniqlang
- Ball 30 dan past bo'lsa, is_valid: false va reject_reason bering
- reject_reason o'zbek tilida, foydalanuvchiga tushunarli bo'lsin
"""
    
    return prompt


def analyze_with_openai(prompt: str, api_key: str, model: str = 'gpt-4o-mini') -> Dict[str, Any]:
    """OpenAI orqali tahlil"""
    import requests
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'model': model,
        'messages': [
            {
                'role': 'system',
                'content': 'Siz O\'zbekiston hokimiyatlariga keladigan murojaatlarni tahlil qiluvchi AI yordamchisisiz. Faqat JSON formatida javob bering.'
            },
            {
                'role': 'user',
                'content': prompt
            }
        ],
        'temperature': 0.3,
        'max_tokens': 1000
    }
    
    response = requests.post(
        'https://api.openai.com/v1/chat/completions',
        headers=headers,
        json=data,
        timeout=30
    )
    
    if response.status_code != 200:
        raise Exception(f"OpenAI API xatosi: {response.status_code} - {response.text}")
    
    result = response.json()
    content = result['choices'][0]['message']['content']
    
    # JSON parse qilish
    return parse_ai_response(content)


def analyze_with_anthropic(prompt: str, api_key: str, model: str = 'claude-3-haiku-20240307') -> Dict[str, Any]:
    """Anthropic Claude orqali tahlil"""
    import requests
    
    headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
    }
    
    data = {
        'model': model,
        'max_tokens': 1000,
        'messages': [
            {
                'role': 'user',
                'content': prompt
            }
        ]
    }
    
    response = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers=headers,
        json=data,
        timeout=30
    )
    
    if response.status_code != 200:
        raise Exception(f"Anthropic API xatosi: {response.status_code} - {response.text}")
    
    result = response.json()
    content = result['content'][0]['text']
    
    # JSON parse qilish
    return parse_ai_response(content)


def parse_ai_response(content: str) -> Dict[str, Any]:
    """AI javobini parse qilish"""
    
    # JSON qismini ajratish
    try:
        # Agar to'liq JSON bo'lsa
        if content.strip().startswith('{'):
            return json.loads(content)
        
        # JSON blokini topish
        start = content.find('{')
        end = content.rfind('}') + 1
        
        if start != -1 and end > start:
            json_str = content[start:end]
            return json.loads(json_str)
        
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse xatosi: {e}")
    
    # Standart javob
    return {
        'analysis': content[:500],
        'score': 70,
        'priority': 'medium',
        'is_valid': True,
        'reject_reason': None
    }


def validate_appeal_content(text: str) -> Dict[str, Any]:
    """
    Tez tekshirish - AI chaqirmasdan
    Spam, bo'sh matn, va oddiy filtrlar
    """
    
    # Bo'sh yoki juda qisqa matn
    if not text or len(text.strip()) < 20:
        return {
            'is_valid': False,
            'reason': 'Murojaat matni juda qisqa'
        }
    
    # Spam so'zlar
    spam_words = [
        'казино', 'casino', 'реклама', 'viagra', 'cialis',
        'криптовалюта', 'bitcoin', 'заработок', 'доход',
        'http://', 'https://', 'www.', '.com', '.ru',
        'подписывайтесь', 'подпишитесь', 'telegram.me'
    ]
    
    text_lower = text.lower()
    for word in spam_words:
        if word in text_lower:
            return {
                'is_valid': False,
                'reason': f'Spam so\'z aniqlandi: {word}'
            }
    
    # Faqat emojilar
    import re
    text_without_emoji = re.sub(r'[^\w\s]', '', text)
    if len(text_without_emoji.strip()) < 10:
        return {
            'is_valid': False,
            'reason': 'Murojaat mazmunli matn o\'z ichiga olmaydi'
        }
    
    return {
        'is_valid': True,
        'reason': None
    }
