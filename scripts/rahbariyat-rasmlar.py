"""
Rahbariyat rasmlarini Hukumat portalidan yuklab, kattalashtirib va
tiniqlashtirib `public/rahbariyat/` ga qo'yadi.

Nega kerak: portaldagi asl rasmlar kichik va siqilgan. Landing karuselida
300px kenglikda, retina ekranda 600px talab qilinadi. Skript:
  1. rasmni yuklaydi (api-portal.gov.uz),
  2. Lanczos bilan 2x kattalashtiradi (kichik bo'lsa),
  3. UnsharpMask (radius 2, percent 120, threshold 3) qo'llaydi,
  4. 4:5 nisbatda, yuz yuqorida qoladigan tarzda kesadi,
  5. WebP (sifat 90) sifatida saqlaydi.

Ishlatish:
    pip install pillow requests
    python scripts/rahbariyat-rasmlar.py

Keyin `components/landing/landing-data.ts` dagi `photo` maydonlarini
`/rahbariyat/<fayl>.webp` ga almashtiring — sayt tashqi serverga bog'liq
bo'lmay qoladi.

Rasmlar ro'yxati landing-data.ts dan qo'lda ko'chirilgan (skript TS
faylni o'qimaydi — oddiy va shaffof bo'lishi uchun).
"""

from __future__ import annotations

import io
import re
import sys
from pathlib import Path

try:
    import requests
    from PIL import Image, ImageFilter
except ImportError:  # pragma: no cover
    sys.exit("pip install pillow requests")

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "rahbariyat"
DATA = ROOT / "components" / "landing" / "landing-data.ts"

TARGET_W = 600  # 300px karta × 2 (retina)
RATIO = 4 / 5


def slug(name: str) -> str:
    s = name.lower()
    s = s.replace("‘", "").replace("’", "").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def read_people() -> list[tuple[str, str]]:
    """landing-data.ts dan (ism, rasm URL) juftliklarini oladi."""
    text = DATA.read_text(encoding="utf-8")
    block = text.split("export const RAHBARIYAT")[1].split("]")[0]
    names = re.findall(r'name:\s*"([^"]+)"', block)
    photos = re.findall(r'photo:\s*\n?\s*"([^"]+)"', block)
    if len(names) != len(photos):
        sys.exit(f"Nom/rasm soni mos emas: {len(names)} / {len(photos)}")
    return list(zip(names, photos))


def process(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    w, h = img.size
    if w < TARGET_W:
        scale = TARGET_W / w
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        w, h = img.size
    # 4:5 kesish — yuz yuqorida bo'lgani uchun yuqoridan boshlab
    target_h = round(w / RATIO)
    if h > target_h:
        img = img.crop((0, 0, w, target_h))
    elif h < target_h:
        target_w = round(h * RATIO)
        left = (w - target_w) // 2
        img = img.crop((left, 0, left + target_w, h))
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=3))
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    people = read_people()
    for name, url in people:
        fn = OUT / f"{slug(name)}.webp"
        print(f"→ {name}")
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        img = process(Image.open(io.BytesIO(r.content)))
        img.save(fn, "WEBP", quality=90, method=6)
        print(f"   {fn.relative_to(ROOT)}  {img.size[0]}×{img.size[1]}")
    print("\nTayyor. landing-data.ts dagi photo maydonlarini quyidagilarga almashtiring:")
    for name, _ in people:
        print(f'  "/rahbariyat/{slug(name)}.webp"   ← {name}')


if __name__ == "__main__":
    main()
