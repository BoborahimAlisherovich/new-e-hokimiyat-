"""AuditLog: «Topshiriq ko'rib chiqishga olindi» amali qo'shildi.

Ijrochi topshiriqni ochganda holat `YANGI` -> `TEKSHIRUVDA` ga o'tadi va
bu amal jurnalga yoziladi. Ilgari bunday amal turi yo'q edi.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='auditlog',
            name='action',
            field=models.CharField(
                choices=[
                ('USER_CREATED', "Foydalanuvchi yaratildi"),
                ('USER_UPDATED', "Foydalanuvchi yangilandi"),
                ('USER_BLOCKED', "Foydalanuvchi bloklandi"),
                ('USER_ARCHIVED', "Foydalanuvchi arxivlandi"),
                ('USER_ACTIVATED', "Foydalanuvchi faollashtirildi"),
                ('USER_LOGIN', "Foydalanuvchi kirdi"),
                ('USER_LOGOUT', "Foydalanuvchi chiqdi"),
                ('USER_LOGIN_FAILED', "Kirish muvaffaqiyatsiz"),
                ('ORG_CREATED', "Tashkilot yaratildi"),
                ('ORG_UPDATED', "Tashkilot yangilandi"),
                ('ORG_DELETED', "Tashkilot o'chirildi"),
                ('TASK_CREATED', "Topshiriq yaratildi"),
                ('TASK_UPDATED', "Topshiriq yangilandi"),
                ('TASK_VIEWED', "Topshiriq ko'rib chiqishga olindi"),
                ('TASK_ACCEPTED', "Topshiriq qabul qilindi"),
                ('TASK_COMPLETED', "Topshiriq bajarildi"),
                ('TASK_REASSIGNED', "Topshiriq qayta yuborildi"),
                ('TASK_CLOSED', "Topshiriq yopildi"),
                ('TASK_OVERDUE', "Topshiriq muddati o'tdi"),
                ('REPORT_SUBMITTED', "Hisobot topshirildi"),
                ('REPORT_REVIEWED', "Hisobot ko'rib chiqildi"),
                ('EXTENSION_REQUESTED', "Muddat uzaytirish so'raldi"),
                ('EXTENSION_APPROVED', "Muddat uzaytirish tasdiqlandi"),
                ('EXTENSION_REJECTED', "Muddat uzaytirish rad etildi"),
                ('SYSTEM_ERROR', "Tizim xatosi"),
                ('DATA_EXPORT', "Ma'lumotlar eksport qilindi"),
                ],
                max_length=50,
                verbose_name='Amal',
            ),
        ),
    ]
