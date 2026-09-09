#!/usr/bin/env python3
"""
PALITRA MIGRATSIYASI — 3-BOSQICH: GRADIENTLAR.

Nega: kartalarga qo'yilgan bezak gradientlari («from-cyan-50 to-cyan-100»)
2015 yilgi admin shablon ko'rinishini beradi va dark temada ishlamaydi.
Talab qilingan standart: sirtlar tekis, ajratish esa fon kontrasti va
yumshoq soya bilan.

Qoida (har bir className satri alohida ko'riladi):
  · Barcha gradient to'xtashlari OCHIQ bo'lsa (daraja <= 200) — gradient
    olib tashlanadi va o'rniga bitta TEKIS token fon qo'yiladi:
        indigo/cyan/sky -> bg-primary-soft
        slate/gray      -> bg-background
    Agar satrda allaqachon boshqa `bg-*` bo'lsa, yangi fon qo'shilmaydi
    (mavjudi yetarli).
  · To'yingan to'xtash bo'lsa (daraja >= 500) va oila aksent bo'lsa —
    gradient SAQLANADI, lekin to'xtashlar saytning tokenlariga o'giriladi:
        from-* -> from-primary,  via-* -> via-primary,  to-* -> to-primary-hover
  · slate/gray ning to'yingan to'xtashlari (from-gray-400, to-slate-700 …)
    TEGILMAYDI — ular kam va ko'z bilan ko'rib tuzatilishi kerak.
"""
import os, re, sys

ACCENT = {"indigo", "cyan", "sky"}
STOP = re.compile(r"(?<![\w-])(from|via|to)-(slate|gray|indigo|cyan|sky)-(\d{2,3})(?:/(\d{1,3}))?(?![\w/-])")
GRAD = re.compile(r"(?<![\w-])bg-gradient-to-[a-z]{1,2}(?![\w-])")
# className="..." yoki className={cn("...", ...)} ichidagi oddiy satrlar
STRLIT = re.compile(r'"([^"\n]*)"')
OTHER_BG = re.compile(r"(?<![\w-])bg-(?!gradient-)[a-z][\w\[\]\(\),./#%-]*")

SKIP_DIRS = {"node_modules", ".next", "legacy", "ui"}

def process_class_string(s):
    stops = list(STOP.finditer(s))
    if not stops or not GRAD.search(s):
        return s, 0
    shades = [int(m.group(3)) for m in stops]
    fams = {m.group(2) for m in stops}
    saturated = [sh for sh in shades if sh >= 500]
    if saturated:
        if not fams <= ACCENT:
            return s, 0          # kulrang to'yingan gradient — qo'l bilan
        def rw(m):
            kind = m.group(1)
            return {"from": "from-primary", "via": "via-primary", "to": "to-primary-hover"}[kind]
        out = STOP.sub(rw, s)
        return out, 1
    # hammasi ochiq -> tekislaymiz
    out = GRAD.sub("", s)
    out = STOP.sub("", out)
    out = re.sub(r"\s{2,}", " ", out).strip()
    if not OTHER_BG.search(out):
        flat = "bg-primary-soft" if fams <= ACCENT else "bg-background"
        out = (flat + " " + out).strip()
    return out, 1

def process_file(path, apply):
    src = open(path, encoding="utf8").read()
    changes = 0
    def repl(m):
        nonlocal changes
        inner = m.group(1)
        out, n = process_class_string(inner)
        changes += n
        return '"' + out + '"'
    new = STRLIT.sub(repl, src)
    if changes and apply:
        open(path, "w", encoding="utf8").write(new)
    return changes, src, new

def main(roots, apply, show):
    total, touched = 0, []
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if not fn.endswith((".tsx", ".ts")):
                    continue
                path = os.path.join(dirpath, fn)
                n, src, new = process_file(path, apply)
                if n:
                    total += n
                    touched.append((path, n))
                    if show and path.endswith(show):
                        import difflib
                        for line in difflib.unified_diff(src.splitlines(), new.splitlines(), lineterm="", n=0):
                            print(line[:200])
    touched.sort(key=lambda x: -x[1])
    for p, n in touched:
        print(f"{n:4d}  {p}")
    print(f"\n{'YOZILDI' if apply else 'QURUQ ISHLASH'}: {len(touched)} fayl, {total} gradient")

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    show = None
    for a in sys.argv[1:]:
        if a.startswith("--show="):
            show = a.split("=", 1)[1]
    main(args or ["app", "components"], "--apply" in sys.argv, show)
