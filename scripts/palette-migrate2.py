#!/usr/bin/env python3
"""
PALITRA MIGRATSIYASI — 2-BOSQICH (umumiy qoidalar).

1-bosqich aniq sinf nomlarini almashtirdi. Bu bosqich qolgan
"quyruq"ni oladi: har qanday shaffoflik variantidagi
(border|bg|text|ring|divide)-(slate|gray|indigo|cyan|sky)-<daraja>
sinfini darajaga qarab tokenga o'giradi. Shaffoflik suffiksi
ring-* da saqlanadi, boshqa joyda tashlanadi (token sirtlarida
shaffoflik kerak emas).

TEGILMAYDI:
  · bg-slate-800 / bg-slate-900 — bu ataylab qo'yilgan quyuq
    tugmalar, ular `text-white` bilan juftlashgan (Linear/Vercel
    uslubi), kontrasti yaxshi;
  · gradient sinflari (from-/to-/via-) — alohida ko'rib chiqiladi.
"""
import os, re, sys

FAM_ACCENT = {"indigo", "cyan", "sky"}

def repl_text(fam, shade, op):
    if fam in FAM_ACCENT:
        return "text-primary"
    return "text-foreground" if shade >= 700 else "text-muted-foreground"

def repl_bg(fam, shade, op):
    if fam in FAM_ACCENT:
        return "bg-primary-soft" if shade <= 200 else "bg-primary"
    if shade >= 800:
        return None                      # quyuq tugma — tegilmaydi
    if shade <= 50:
        return "bg-background"
    if shade <= 200:
        return "bg-muted"
    return "bg-secondary"

def repl_border(fam, shade, op):
    if shade <= 200:
        return "border-border"
    if shade <= 400:
        return "border-border-strong"
    return "border-ring" if fam in FAM_ACCENT else "border-border-strong"

def repl_ring(fam, shade, op):
    base = "ring-ring" if fam in FAM_ACCENT else "ring-border"
    return base + ("/" + op if op else "")

def repl_divide(fam, shade, op):
    return "divide-border"

HANDLERS = {
    "text": repl_text,
    "bg": repl_bg,
    "border": repl_border,
    "ring": repl_ring,
    "divide": repl_divide,
}

PAT = re.compile(
    r"(?<![\w-])(text|bg|border|ring|divide)-(slate|gray|indigo|cyan|sky)-(\d{2,3})(?:/(\d{1,3}))?(?![\w/-])"
)

SKIP_DIRS = {"node_modules", ".next", "legacy", "ui"}

def sub(m):
    prop, fam, shade, op = m.group(1), m.group(2), int(m.group(3)), m.group(4)
    out = HANDLERS[prop](fam, shade, op)
    return out if out else m.group(0)

def main(roots, apply):
    total, touched = 0, []
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if not fn.endswith((".tsx", ".ts")):
                    continue
                path = os.path.join(dirpath, fn)
                src = open(path, encoding="utf8").read()
                out, n = PAT.subn(sub, src)
                # subn n ga tegilmagan mosliklar ham kiradi — haqiqiy o'zgarishni tekshiramiz
                if out != src:
                    real = sum(1 for _ in PAT.finditer(src)) - sum(1 for _ in PAT.finditer(out))
                    total += max(real, 1)
                    touched.append((path, max(real, 1)))
                    if apply:
                        open(path, "w", encoding="utf8").write(out)
    touched.sort(key=lambda x: -x[1])
    for p, n in touched:
        print(f"{n:4d}  {p}")
    print(f"\n{'YOZILDI' if apply else 'QURUQ ISHLASH'}: {len(touched)} fayl, ~{total} almashtirish")

if __name__ == "__main__":
    apply = "--apply" in sys.argv
    roots = [a for a in sys.argv[1:] if not a.startswith("--")] or ["app", "components"]
    main(roots, apply)
