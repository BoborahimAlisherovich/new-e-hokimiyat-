import base64
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Web push uchun VAPID kalitlar yaratadi va private key faylini saqlaydi"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default="backend/webpush_private_key.pem",
            help="Private key saqlanadigan fayl yo'li",
        )

    def handle(self, *args, **options):
        try:
            from py_vapid import Vapid
            from cryptography.hazmat.primitives import serialization
        except Exception as exc:
            raise CommandError(
                "py_vapid yoki cryptography topilmadi. Avval dependencies o'rnatilsin: pip install -r backend/requirements.txt"
            ) from exc

        output_path = Path(options["output"]).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)

        vapid = Vapid()
        vapid.generate_keys()

        private_pem = vapid.private_pem().decode("utf-8")
        public_bytes = vapid.public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )
        public_key = base64.urlsafe_b64encode(public_bytes).rstrip(b"=").decode("utf-8")

        output_path.write_text(private_pem, encoding="utf-8")

        self.stdout.write(self.style.SUCCESS("VAPID kalitlar yaratildi"))
        self.stdout.write("")
        self.stdout.write(f"Private key fayli: {output_path}")
        self.stdout.write("")
        self.stdout.write("Production .env uchun:")
        self.stdout.write(f"WEB_PUSH_PUBLIC_KEY={public_key}")
        self.stdout.write(f"WEB_PUSH_PRIVATE_KEY_PATH={output_path}")
        self.stdout.write("WEB_PUSH_SUBJECT=mailto:admin@example.com")
