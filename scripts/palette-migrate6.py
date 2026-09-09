#!/usr/bin/env python3
"""
PALITRA MIGRATSIYASI — 6-BOSQICH: GRADIENTLARNI TEKISLASH.

Nega: kartalar va qatorlarga qo'yilgan bezak gradientlari
(`bg-gradient-to-r from-cyan-50 to-cyan-100/70`) 2015 yilgi admin
shablon ko'rinishini beradi, dark temada butunlay ishlamaydi va
tasdiqlangan standartga qarshi: sirtlar TEKIS bo'lishi, ajratish esa
fon kontrasti va yumshoq soya bilan berilishi kerak.

Har bir className satri so'zlarga bo'linadi va variant prefiksi
(`hover:`, `dark:` …) bo'yicha guruhlanadi. Guruhda `bg-gradient-to-*`
bo'lsa:
  · to'yingan to'xtash (daraja >= 400) bo'lsa  -> tekis `bg-<sem>`
  · hammasi ochiq bo'lsa                       -> tekis `bg-<sem>-soft`
    (slate/gray -> `bg-background`, faqat white/transparent -> `bg-card`)
Gradient va to'xtash sinflari o'chiriladi. Agar shu prefiksda allaqachon
boshqa `bg-*` bo'lsa, yangi fon qo'shilmaydi.

TEGILMAYDI: qiymati qo'lda yozilgan gradientlar (`from-[#...]`) va
`components/landing` — ular ataylab shunday chizilgan.
"""
import os, re, sys

SEM = {
    "emerald": "success", "green": "success", "teal": "success", "lime": "success",
    "amber": "warning", "orange": "warning", "yellow": "warning",
    "red": "destructive", "rose": "destructive", "pink": "destructive",
    "blue": "primary", "cyan": "primary", "sky": "primary", "indigo": "primary",
    "violet": "violet", "purple": "violet", "fuchsia": "violet",
}
NEUTRAL = {"slate", "gray", "zinc", "neutral", "stone"}
COLORLESS = {"white", "black", "transparent", "current", "inherit"}

VIOLET_SOFT = "bg-[var(--st-tekshiruvda-bg)]"

GRAD_RE = re.compile(r"^((?:[\w-]+:)*)bg-gradient-to-[a-z]{1,3}$")
STOP_RE = re.compile(r"^((?:[\w-]+:)*)(from|via|to)-(.+)$")
BG_RE = re.compile(r"^((?:[\w-]+:)*)bg-(?!gradient-)(.+)$")
STRLIT = re.compile(r'"([^"\n]*)"')
SKIP_DIRS = {"node_modules", ".next", "legacy", "ui", "landing"}


def parse_stop(rest):
    """('cyan', 50) | ('white', None) | None (qo'lda yozilgan qiymat)"""
    if rest.startswith("["):
        return None
    base = rest.split("/")[0]
    m = re.match(r"^([a-z]+)-(\d{2,3})$", base)
    if m:
        return m.group(1), int(m.group(2))
    if base in COLORLESS:
        return base, None
    return None


def flat_for(fams, saturated):
    real = [f for f in fams if f not in COLORLESS]
    if not real:
        return "bg-card"
    fam = real[0]
    if fam in NEUTRAL:
        return "bg-secondary" if saturated else "bg-background"
    sem = SEM.get(fam)
    if not sem:
        return None
    if sem == "violet":
        return VIOLET_SOFT
    return f"bg-{sem}" if saturated else f"bg-{sem}-soft"


def process(cls):
    words = cls.split()
    if not any(GRAD_RE.match(w) for w in words):
        return cls, 0

    groups = {}
    for i, w in enumerate(words):
        m = GRAD_RE.match(w)
        if m:
            groups.setdefault(m.group(1), {"grad": [], "stops": []})["grad"].append(i)
            continue
        m = STOP_RE.match(w)
        if m:
            groups.setdefault(m.group(1), {"grad": [], "stops": []})["stops"].append((i, m.group(3)))

    drop, add, changed = set(), [], 0
    for prefix, g in groups.items():
        if not g["grad"]:
            continue
        parsed = [parse_stop(rest) for _, rest in g["stops"]]
        if any(p is None for p in parsed) or not parsed:
            continue                       # qo'lda yozilgan qiymat — tegilmaydi
        fams = [p[0] for p in parsed]
        saturated = any(p[1] is not None and p[1] >= 400 for p in parsed)
        flat = flat_for(fams, saturated)
        if flat is None:
            continue
        drop.update(g["grad"])
        drop.update(i for i, _ in g["stops"])
        has_bg = any(
            (BG_RE.match(w) and BG_RE.match(w).group(1) == prefix)
            for i, w in enumerate(words)
            if i not in drop
        )
        if not has_bg:
            add.append(prefix + flat)
        changed += 1

    if not changed:
        return cls, 0
    kept = [w for i, w in enumerate(words) if i not in drop]
    return " ".join(add + kept), changed


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
                            print(line[:230])
                    if apply:
                        open(path, "w", encoding="utf8").write(new)
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
