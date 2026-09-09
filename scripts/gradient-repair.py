# -*- coding: utf-8 -*-
"""
GRADIYENT TOZALASH — Bootstrap davri ko'rinishini olib tashlash.

Loyiha dizayn standarti: yassi, token asosidagi ranglar. Gradiyentlar
(bg-gradient-to-* + from-/via-/to-) qabul qilinmaydi, chunki:
  - qorong'i mavzuda rangi hisoblanmaydi (tokenlarga bog'lanmagan),
  - kontrast o'lchanmaydi (matn gradiyent ustida turadi),
  - «premium» emas, 2015 yil admin shabloniga o'xshaydi.

Bu skript FAQAT mexanik almashtirishlarni bajaradi. Holat chegaralari
(border-primary), ma'noli ranglar va maxsus hollar qo'lda hal qilinadi.

Ishga tushirish:  python scripts/gradient-repair.py [--apply]
"""
import io, os, re, sys

APPLY = '--apply' in sys.argv

SKIP_DIRS = {'node_modules', '.next', '.git', 'backend', 'public', 'venv',
             '__pycache__', '_to_delete', 'landing'}

# Hue -> token juftligi (fon, matn)
HUE = {
    'green': ('success', 'success-foreground'),
    'emerald': ('success', 'success-foreground'),
    'teal': ('success', 'success-foreground'),
    'lime': ('success', 'success-foreground'),
    'red': ('destructive', 'destructive-foreground'),
    'rose': ('destructive', 'destructive-foreground'),
    'orange': ('warning', 'warning-foreground'),
    'amber': ('warning', 'warning-foreground'),
    'yellow': ('warning', 'warning-foreground'),
    'blue': ('primary', 'primary-foreground'),
    'sky': ('info', 'info-foreground'),
    'cyan': ('info', 'info-foreground'),
    'indigo': ('primary', 'primary-foreground'),
    'violet': ('primary', 'primary-foreground'),
    'purple': ('primary', 'primary-foreground'),
    'fuchsia': ('primary', 'primary-foreground'),
    'pink': ('primary', 'primary-foreground'),
    'slate': ('muted', 'muted-foreground'),
    'gray': ('muted', 'muted-foreground'),
    'zinc': ('muted', 'muted-foreground'),
    'neutral': ('muted', 'muted-foreground'),
    'stone': ('muted', 'muted-foreground'),
}

STOP = re.compile(
    r'(?:(?P<variant>[a-z-]+(?:\[[^\]]*\])?:)?)'
    r'(?P<kind>from|via|to)-(?P<hue>[a-z]+)-(?P<shade>\d{2,3})'
    r'(?:/(?P<alpha>\d+))?'
)
DIRECTION = re.compile(
    r'(?:(?P<variant>[a-z-]+(?:\[[^\]]*\])?:)?)'
    r'bg-gradient-to-(?:t|tr|r|br|b|bl|l|tl)\b'
)

def dominant(stops):
    """Gradiyentdagi asosiy hue: eng to'q `from` yoki birinchi ma'noli."""
    for s in stops:
        if s['kind'] == 'from' and s['hue'] in HUE:
            return HUE[s['hue']]
    for s in stops:
        if s['hue'] in HUE:
            return HUE[s['hue']]
    return None

def repair_classlist(text):
    """Bitta class satrini tozalaydi. (yangi_matn, o'zgarishlar) qaytaradi."""
    changes = []

    # Variant bo'yicha guruhlaymiz: `data-[state=active]:` va bo'sh variant
    groups = {}
    for m in STOP.finditer(text):
        v = m.group('variant') or ''
        groups.setdefault(v, []).append({
            'kind': m.group('kind'), 'hue': m.group('hue'),
            'shade': m.group('shade'), 'span': m.span(), 'raw': m.group(0),
        })

    if not groups:
        return text, changes

    out = text
    for variant, stops in groups.items():
        tok = dominant(stops)
        if not tok:
            continue
        bg, fg = tok
        # 1) yo'nalish klassini yassi fonga aylantiramiz
        dir_pat = re.compile(re.escape(variant) + r'bg-gradient-to-(?:t|tr|r|br|b|bl|l|tl)\b')
        if dir_pat.search(out):
            out = dir_pat.sub(variant + 'bg-' + bg, out, count=1)
            changes.append('gradient->bg-' + bg)
        else:
            # yo'nalish yo'q (masalan faqat `from-` qolgan) — fon qo'shamiz
            out = out + ' ' + variant + 'bg-' + bg
            changes.append('bg-' + bg + ' qo\'shildi')
        # 2) barcha to'xtash nuqtalarini olib tashlaymiz
        for s in stops:
            out = re.sub(r'(?<![\w-])' + re.escape(variant) + s['kind'] + '-' +
                         s['hue'] + '-' + s['shade'] + r'(?:/\d+)?(?![\w-])',
                         '', out)
        # 3) text-white -> tokenga
        out = re.sub(r'(?<![\w-])' + re.escape(variant) + r'text-white(?![\w-])',
                     variant + 'text-' + fg, out)

    out = re.sub(r'\s{2,}', ' ', out).strip()
    return out, changes

CLASS_ATTR = re.compile(r'(className=")([^"]*)(")')
CN_STR = re.compile(r'(")([^"]*(?:from|via|to)-[a-z]+-\d{2,3}[^"]*)(")')

def process(path):
    src = io.open(path, encoding='utf-8', errors='replace').read()
    orig = src
    log = []

    def sub_attr(m):
        new, ch = repair_classlist(m.group(2))
        if ch:
            log.extend(ch)
        return m.group(1) + new + m.group(3)

    src = CLASS_ATTR.sub(sub_attr, src)

    # cn(...) va `color: "from-... to-..."` kabi mustaqil satrlar
    def sub_str(m):
        body = m.group(2)
        if 'className' in body:
            return m.group(0)
        new, ch = repair_classlist(body)
        if ch:
            log.extend(ch)
        return m.group(1) + new + m.group(3)

    src = CN_STR.sub(sub_str, src)

    if src != orig:
        if APPLY:
            io.open(path, 'w', encoding='utf-8', newline='').write(src)
        return log
    return []

total = 0
files = 0
for dp, dn, fn in os.walk('.'):
    dn[:] = [d for d in dn if d not in SKIP_DIRS and not d.startswith('.')]
    for f in fn:
        if not f.endswith(('.tsx', '.ts')):
            continue
        p = os.path.join(dp, f)
        log = process(p)
        if log:
            files += 1
            total += len(log)
            print('%-64s %d' % (p, len(log)))

print()
print('%s: %d fayl, %d almashtirish' % ('QO\'LLANDI' if APPLY else 'SINOV', files, total))
