#!/usr/bin/env python3
"""
PALITRA MIGRATSIYASI — 5-BOSQICH: SOFT FON USTIDAGI MATN.

4-bosqichdan keyin holat "chip"lari `bg-<sem>-soft text-<sem>` ko'rinishida
qoldi. O'lchandi: bunday juftliklarning ikkisi WCAG AA (4.5:1) dan past —
  destructive #dc2626 / #feecef = 4.24:1
  primary     #3366ff / #ebf0ff = 4.11:1
Dizayn tizimida shu holat uchun alohida token bor: `-soft-foreground`.
U bilan kontrast 5.69–7.66:1 ga chiqadi.

Shu sababli: bitta className satrida `bg-<sem>-soft` bo'lsa,
`text-<sem>` -> `text-<sem>-soft-foreground` ga o'giriladi.
"""
import os, re, sys

SEMS = ["success", "warning", "destructive", "primary", "info"]
STRLIT = re.compile(r'"([^"\n]*)"')
SKIP_DIRS = {"node_modules", ".next", "legacy", "ui"}

def fix(s):
    n = 0
    for sem in SEMS:
        if f"bg-{sem}-soft" not in s:
            continue
        pat = re.compile(r"(?<![\w-])text-" + sem + r"(?![\w-])")
        s, k = pat.subn(f"text-{sem}-soft-foreground", s)
        n += k
    return s, n

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
                cnt = 0
                def repl(m):
                    nonlocal cnt
                    out, k = fix(m.group(1))
                    cnt += k
                    return '"' + out + '"'
                new = STRLIT.sub(repl, src)
                if cnt:
                    total += cnt
                    touched.append((path, cnt))
                    if apply:
                        open(path, "w", encoding="utf8").write(new)
    touched.sort(key=lambda x: -x[1])
    for p, n in touched:
        print(f"{n:4d}  {p}")
    print(f"\n{'YOZILDI' if apply else 'QURUQ ISHLASH'}: {len(touched)} fayl, {total} almashtirish")

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(args or ["app", "components"], "--apply" in sys.argv)
