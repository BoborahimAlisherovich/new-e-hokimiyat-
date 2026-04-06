# Web Push Setup

Production browser push ishlashi uchun quyidagi qadamlar kerak:

1. VAPID kalit yarating:

```bash
.venv/bin/python backend/manage.py generate_vapid_keys --output backend/webpush_private_key.pem
```

2. Backend `.env` ga qiymatlarni kiriting:

```env
WEB_PUSH_PUBLIC_KEY=BJ0Up8NJj6Cxv27TiB7_KmVMGeKLjgUgoS0v5av8E1whssiVm7SeJSsQ_2ol1xf1SweLslfHQ40oN6wLzRaFK-0
WEB_PUSH_PRIVATE_KEY_PATH=/home/rasulbek/another-project/e-hokimiyat-hatirchi/backend/webpush_private_key.pem
WEB_PUSH_SUBJECT=mailto:admin@example.com
```

3. Migratsiyalarni ishga tushiring:

```bash
.venv/bin/python backend/manage.py migrate notifications
```

4. Frontend va backend `https` orqali ishlayotganini tekshiring.

Eslatma:
- Browser push odatda faqat `https` da ishlaydi.
- iPhone/iPad Safari’da push uchun sayt PWA sifatida Home Screen’ga o‘rnatilgan bo‘lishi kerak.
- Sozlamalardagi `Push bildirishnomalari` yoqilganda brauzer ruxsati ham berilgan bo‘lishi kerak.
