#!/usr/bin/env python
"""
Telegram Bot Polling skripti
Long polling rejimida ishlatish uchun

Ishga tushirish:
    python run_bot.py

Yoki background da:
    nohup python run_bot.py &
"""

import os
import sys
import time
import logging
import django

# Django setup
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ehokimiyat.settings')
django.setup()

import requests
from telegram_bot.models import BotSettings
from telegram_bot.bot.handlers import process_update

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/telegram_bot.log')
    ]
)
logger = logging.getLogger(__name__)


def get_updates(token: str, offset: int = 0, timeout: int = 30) -> tuple:
    """Telegram'dan yangilanishlarni olish
    
    Returns:
        tuple: (updates_list, is_conflict_error)
    """
    url = f'https://api.telegram.org/bot{token}/getUpdates'
    params = {
        'offset': offset,
        'timeout': timeout,
        'allowed_updates': ['message', 'callback_query']
    }
    
    try:
        response = requests.get(url, params=params, timeout=timeout + 10)
        data = response.json()
        
        if data.get('ok'):
            return data.get('result', []), False
        else:
            error_desc = data.get('description', '')
            error_code = data.get('error_code', 0)
            
            # 409 Conflict - boshqa bot ishlayapti
            if error_code == 409:
                logger.warning(f"Conflict xatosi: Boshqa bot ishlayapti. 10 soniya kutamiz...")
                return [], True
            
            logger.error(f"Telegram API xatosi: {error_desc}")
            return [], False
    except requests.exceptions.Timeout:
        return [], False
    except Exception as e:
        logger.error(f"Yangilanishlarni olishda xato: {e}")
        time.sleep(5)
        return [], False


def run_polling():
    """Polling boshlash"""
    logger.info("Telegram Bot polling boshlanmoqda...")
    
    # Bot tokenini olish
    settings = BotSettings.objects.first()
    if not settings or not settings.bot_token:
        logger.error("Bot token topilmadi! Admin paneldan token kiriting.")
        return
    
    if settings.use_webhook:
        logger.warning("Webhook rejimi faol. Polling to'xtatildi.")
        return
    
    token = settings.bot_token
    offset = 0
    
    # Webhook o'chirish (agar mavjud bo'lsa)
    try:
        requests.post(f'https://api.telegram.org/bot{token}/deleteWebhook', timeout=10)
    except Exception as e:
        logger.warning(f"Webhook o'chirishda xato: {e}")
    
    logger.info(f"Bot ishga tushdi: @{settings.bot_username or 'unknown'}")
    
    conflict_count = 0
    max_conflicts = 10  # 10 marta ketma-ket conflict bo'lsa to'xtaydi
    
    while True:
        try:
            # Yangilanishlarni olish
            updates, is_conflict = get_updates(token, offset)
            
            if is_conflict:
                conflict_count += 1
                if conflict_count >= max_conflicts:
                    logger.error(f"Juda ko'p conflict! Boshqa joyda bot ishlayapti. 60 soniya kutamiz...")
                    time.sleep(60)
                    conflict_count = 0
                else:
                    time.sleep(10)
                continue
            
            # Conflict yo'q - reset counter
            conflict_count = 0
            
            for update in updates:
                update_id = update.get('update_id', 0)
                offset = update_id + 1
                
                # Log update type
                if 'callback_query' in update:
                    logger.info(f"Callback query received: {update.get('callback_query', {}).get('data', 'unknown')}")
                elif 'message' in update:
                    logger.info(f"Message received from {update.get('message', {}).get('from', {}).get('id', 'unknown')}")
                
                try:
                    # Update'ni qayta ishlash
                    process_update(update)
                except Exception as e:
                    logger.error(f"Update qayta ishlashda xato: {e}", exc_info=True)
            
        except KeyboardInterrupt:
            logger.info("Bot to'xtatildi (Ctrl+C)")
            break
        except Exception as e:
            logger.error(f"Polling xatosi: {e}")
            time.sleep(5)


if __name__ == '__main__':
    # Logs papkasini yaratish
    os.makedirs('logs', exist_ok=True)
    
    run_polling()
