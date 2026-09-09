#!/usr/bin/env python3
"""
PALITRA MIGRATSIYASI — 4-BOSQICH: SEMANTIK RANGLAR.

Tailwind ning xom rang oilalari ma'no bo'yicha tokenlarga o'giriladi,
shuning uchun holat ranglari butun sayt bo'ylab bir xil bo'ladi va
dark temada ham to'g'ri ishlaydi:

    emerald | green | teal        -> success
    amber   | orange | yellow     -> warning
    red     | rose  | pink        -> destructive
    blue                          -> primary
    violet  | purple | fuchsia    -> «tekshiruvda» binafsha tokeni
                                     (--st-tekshiruvda-bg / -fg)

Daraja qoidasi:
    text-*  (har qanday daraja)  -> text-<sem>          (#047857 kabi
              quyuq tonlar oq fonda ham, soft fonda ham 4.5:1 dan yuqori)
    bg-*    <= 200               -> bg-<sem>-soft
    bg-*    >= 400               -> bg-<sem>
    border-* <= 200              -> border-border   (qattiq chegara yo'q)
    border-* >= 300              -> border-<sem>
    ring-*                       -> ring-<sem>/25 (shaffoflik saqlanadi)
    divide-*                     -> divide-border

Gradient sinflari (from-/via-/to-) bu bosqichda TEGILMAYDI.
"""
import os, re, sys

SEM = {
    "emerald": "success", "green": "success", "teal": "success", "lime": "success",
    "amber": "warning", "orange": "warning", "yellow": "warning",
    "red": "destructive", "rose": "destructive", "pink": "destructive",
    "blue": "primary",
}
VIOLET = {"violet", "purple", "fuchsia"}

VAR_BG = "bg-[var(--st-tekshiruvda-bg)]"
VAR_FG = "text-[var(--st-tekshiruvda-fg)]"
VAR_BD = "border-[var(--st-tekshiruvda-bd)]"

PAT = re.compile(
    r"(?<![\w-])(text|bg|border|ring|divide)-("
    + "|".join(list(SEM) + list(VIOLET))
    + r")-(\d{2,3})(?:/(\d{1,3}))?(?![\w/-])"
)

# `components/landing` chetlab o'tiladi: u qo'lda, quyuq shisha panellar
# uchun maxsus tanlangan ranglar bilan yozilgan (masalan quyuq modal
# ustidagi rose-500/14 xato bloki) - token soft ranglari u yerda
# yorug' dog' bo'lib ko'rinadi.
SKIP_DIRS = {"node_modules", ".next", "legacy", "ui", "landing"}

def convert(prop, fam, shade, op):
    if fam in VIOLET:
        if prop == "text":
            return VAR_FG
        if prop == "bg":
            return VAR_BG
        if prop == "border":
            return "border-border" if shade <= 200 else VAR_BD
        if prop == "ring":
            return "ring-ring/25"
        return "divide-border"
    sem = SEM[fam]
    if prop == "text":
        return f"text-{sem}"
    if prop == "bg":
        return f"bg-{sem}-soft" if shade <= 200 else f"bg-{sem}"
    if prop == "border":
        return "border-border" if shade <= 200 else f"border-{sem}"
    if prop == "ring":
        return f"ring-{sem}/{op}" if op else f"ring-{sem}/25"
    return "divide-border"

def sub(m):
    return convert(m.group(1), m.group(2), int(m.group(3)), m.group(4))

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
                if n:
                    total += n
                    touched.append((path, n))
                    if apply:
                        open(path, "w", encoding="utf8").write(out)
    touched.sort(key=lambda x: -x[1])
    for p, n in touched:
        print(f"{n:4d}  {p}")
    print(f"\n{'YOZILDI' if apply else 'QURUQ ISHLASH'}: {len(touched)} fayl, {total} almashtirish")

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(args or ["app", "components"], "--apply" in sys.argv)
