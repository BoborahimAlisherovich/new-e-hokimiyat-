#!/usr/bin/env python3
"""
PALITRA MIGRATSIYASI — 7-BOSQICH: YORUG' FON USTIDAGI "SHISHA"NI OLIB TASHLASH.

Nega:
  1. `bg-white/80` + `backdrop-blur-xl` — bu shisha effekti FAQAT quyuq
     fon yoki surat ustida ma'noga ega. Yorug' boshqaruv panelida u
     shunchaki xira oq dog' beradi, dark temada esa butunlay buziladi
     (oq shaffoflik quyuq fonda kir kul rangga aylanadi).
  2. `backdrop-filter` har bir kadrda qatlamni qayta rasterlaydi — bu
     eng qimmat CSS xususiyatlaridan biri. Foydalanuvchi talabi:
     «loyiha tez, qotmasdan ishlasin». Panelda 100+ blur qatlam bor edi.
  3. `border-white/50` — chegara emas, tuman. Ajratish soya bilan.

Qoida:
    bg-white/<op>      -> bg-card
    border-white/<op>  -> border-border
    ring-white/<op>    -> ring-border
    backdrop-blur-*    -> (o'chiriladi)
    backdrop-saturate-*-> (o'chiriladi)

TEGILMAYDI: `bg-black/<op>` (modal fonlari), `components/landing`
(u yerda shisha surat ustida turadi va o'rinli), `components/ui`.
"""
import os, re, sys

RULES = [
    (re.compile(r"(?<![\w-])bg-white/\d{1,3}(?![\w/-])"), "bg-card"),
    (re.compile(r"(?<![\w-])border-white/\d{1,3}(?![\w/-])"), "border-border"),
    (re.compile(r"(?<![\w-])ring-white/\d{1,3}(?![\w/-])"), "ring-border"),
    (re.compile(r"(?<![\w-])backdrop-blur(?:-(?:none|xs|sm|md|lg|xl|2xl|3xl))?(?![\w-])"), ""),
    (re.compile(r"(?<![\w-])backdrop-saturate-\d{1,3}(?![\w-])"), ""),
    (re.compile(r"(?<![\w-])supports-\[backdrop-filter\]:bg-white/\d{1,3}(?![\w/-])"), ""),
]

STRLIT = re.compile(r'"([^"\n]*)"')
SKIP_DIRS = {"node_modules", ".next", "legacy", "ui", "landing"}


# Quyuq sirt ustidagi shaffof boshqaruvlar (lightbox tugmalari, surat
# ustidagi yozuvlar) TEGILMAYDI: u yerda `bg-white/10` + `text-white`
# ataylab shunday - uni `bg-card` ga aylantirish oq ustiga oq yozuv
# qilib qo'yadi.
DARK_CONTEXT = re.compile(r"(?<![\w-])(?:text-white|bg-black/\d{1,3})(?![\w/-])")


def process(cls):
    if DARK_CONTEXT.search(cls):
        return cls, 0
    out, n = cls, 0
    for pat, rep in RULES:
        out, k = pat.subn(rep, out)
        n += k
    if n:
        # variant prefiksidan qolgan "hover:" kabi yetimlarni tozalash
        out = re.sub(r"(?<!\S)[\w-]+:(?=\s|$)", "", out)
        out = re.sub(r"\s{2,}", " ", out).strip()
    return out, n


def main(roots, apply, show=None):
    total, touched = 0, []
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if not fn.endswith((".tsx", ".ts")):
                    continue
                path = os.path.join(dirpath, fn)
                src = open(path, encoding="utf8").read()
                cnt = 0

                def repl(m):
                    nonlocal cnt
                    out, k = process(m.group(1))
                    cnt += k
                    return '"' + out + '"'

                new = STRLIT.sub(repl, src)
                if cnt:
                    total += cnt
                    touched.append((path, cnt))
                    if show and path.endswith(show):
                        import difflib
                        for line in difflib.unified_diff(
                            src.splitlines(), new.splitlines(), lineterm="", n=0
                        ):
                            print(line[:220])
                    if apply:
                        open(path, "w", encoding="utf8").write(new)
    touched.sort(key=lambda x: -x[1])
    for p, n in touched[:25]:
        print(f"{n:4d}  {p}")
    print(f"\n{'YOZILDI' if apply else 'QURUQ ISHLASH'}: {len(touched)} fayl, {total} almashtirish")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    show = None
    for a in sys.argv[1:]:
        if a.startswith("--show="):
            show = a.split("=", 1)[1]
    main(args or ["app", "components"], "--apply" in sys.argv, show)
