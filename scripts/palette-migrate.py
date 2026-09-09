#!/usr/bin/env python3
"""
PALITRA MIGRATSIYASI — qattiq kodlangan slate/gray/indigo/cyan/sky
sinflarini dizayn tizimi tokenlariga o'tkazadi.

Nega: bu sinflar (a) dark temada ishlamaydi, (b) saytning #3366ff
aksentiga mos emas, (c) `border-slate-200` kabi qattiq chegaralar
Apple/Stripe standartiga qarshi. Tokenlar esa bitta manbadan
(app/globals.css) keladi va ikkala temada to'g'ri ishlaydi.

Gradientlar (from-*/to-*/via-*) VA bg-slate-900 bu bosqichda
tegilmaydi — ular alohida, ko'z bilan ko'rib tuzatiladi.
"""
import os, re, sys

MAP = [
    # --- matn ---
    ("text-slate-900", "text-foreground"),
    ("text-slate-800", "text-foreground"),
    ("text-gray-900",  "text-foreground"),
    ("text-slate-700", "text-secondary-foreground"),
    ("text-gray-700",  "text-secondary-foreground"),
    ("text-slate-600", "text-muted-foreground"),
    ("text-gray-600",  "text-muted-foreground"),
    ("text-slate-500", "text-muted-foreground"),
    ("text-gray-500",  "text-muted-foreground"),
    ("text-slate-400", "text-muted-foreground"),
    ("text-gray-400",  "text-muted-foreground"),
    ("text-slate-300", "text-muted-foreground"),
    ("text-cyan-700",  "text-primary"),
    ("text-cyan-600",  "text-primary"),
    ("text-indigo-700","text-primary"),
    ("text-indigo-600","text-primary"),
    ("text-indigo-500","text-primary"),
    ("text-sky-700",   "text-primary"),
    ("text-sky-600",   "text-primary"),
    # --- fon (shaffoflik variantlari avval) ---
    ("bg-slate-50/80", "bg-background"),
    ("bg-slate-50/70", "bg-background"),
    ("bg-slate-50/60", "bg-background"),
    ("bg-slate-50",    "bg-background"),
    ("bg-gray-50",     "bg-background"),
    ("bg-slate-100/80","bg-muted"),
    ("bg-slate-100",   "bg-muted"),
    ("bg-gray-100",    "bg-muted"),
    ("bg-slate-200",   "bg-secondary"),
    ("bg-indigo-50/50","bg-primary-soft"),
    ("bg-indigo-50/30","bg-primary-soft"),
    ("bg-indigo-50",   "bg-primary-soft"),
    ("bg-indigo-100",  "bg-primary-soft"),
    ("bg-cyan-50",     "bg-primary-soft"),
    ("bg-cyan-100",    "bg-primary-soft"),
    ("bg-sky-50",      "bg-primary-soft"),
    ("bg-sky-100",     "bg-primary-soft"),
    ("bg-indigo-600",  "bg-primary"),
    ("bg-indigo-500",  "bg-primary"),
    ("bg-cyan-600",    "bg-primary"),
    ("bg-sky-600",     "bg-primary"),
    # --- chegara ---
    ("border-slate-200/80", "border-border"),
    ("border-slate-200",    "border-border"),
    ("border-slate-100",    "border-border"),
    ("border-slate-300",    "border-border-strong"),
    ("border-slate-400",    "border-border-strong"),
    ("border-gray-100",     "border-border"),
    ("border-gray-200",     "border-border"),
    ("border-gray-300",     "border-border-strong"),
    ("border-cyan-100/60",  "border-border"),
    ("border-cyan-100/70",  "border-border"),
    ("border-cyan-100",     "border-border"),
    ("border-cyan-200",     "border-border"),
    ("border-indigo-100/40","border-border"),
    ("border-indigo-100/60","border-border"),
    ("border-indigo-100",   "border-border"),
    ("border-indigo-200",   "border-border"),
    ("border-indigo-500",   "border-ring"),
    ("border-indigo-400",   "border-ring"),
    ("border-cyan-400",     "border-ring"),
    ("border-sky-400",      "border-ring"),
    # --- ring / divide ---
    ("ring-indigo-50/30", "ring-ring/20"),
    ("ring-indigo-100",   "ring-ring/25"),
    ("ring-indigo-200",   "ring-ring/30"),
    ("ring-indigo-500",   "ring-ring"),
    ("ring-slate-100",    "ring-border"),
    ("ring-slate-200",    "ring-border"),
    ("ring-cyan-500/30",  "ring-ring/30"),
    ("divide-slate-100",  "divide-border"),
    ("divide-slate-200",  "divide-border"),
    ("divide-gray-200",   "divide-border"),
]

SKIP_DIRS = {"node_modules", ".next", "legacy", "ui"}

def files(roots):
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if fn.endswith((".tsx", ".ts")):
                    yield os.path.join(dirpath, fn)

def main(roots, apply):
    total = 0
    touched = []
    for path in files(roots):
        src = open(path, encoding="utf8").read()
        out = src
        n = 0
        for a, b in MAP:
            pat = re.compile(r"(?<![\w-])" + re.escape(a) + r"(?![\w/-])")
            out, k = pat.subn(b, out)
            n += k
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
    apply = "--apply" in sys.argv
    roots = [a for a in sys.argv[1:] if not a.startswith("--")] or ["app", "components"]
    main(roots, apply)
