#!/usr/bin/env python3
"""
PALITRA TA'MIRI — avtomatik migratsiya xato qilgan joylar.

Sabab: 4- va 6-bosqichlar shaffoflik suffiksini hisobga olmadi.
`bg-emerald-500/10` (ko'zga och yashil tint) `bg-success` (to'q yashil)
bo'lib qoldi, ustidagi `text-success` esa ko'rinmay ketdi. Shunday
joylar 8 ta topildi va qo'lda tuzatiladi:

  · settings/page.tsx  — bezak "orb"lari butunlay olib tashlanadi
    (standart: bezak blur dog'lari yo'q);
  · org-dashboard.tsx  — statistika kartalari va tashkilot kartasi
    soft tokenlarga o'tadi (ikonka ko'rinadigan bo'ladi);
  · organization-ratings.tsx — "samaradorlik" chipi soft tokenga,
    qattiq chegara olib tashlanadi;
  · notification-constants.ts va notifications/[id] — `bg-<sem>/10`
    juftliklari `-soft` + `-soft-foreground` ga (o'lchangan kontrast:
    primary 4.11:1 -> 7.66:1).

Qo'shimcha: soft fon ustidagi `border-<sem>` chegaralar olib tashlanadi —
tasdiqlangan standart qattiq rangli chegarani taqiqlaydi.
"""
import re, sys

EDITS = [
    # ---------------------------------------------------------------- settings
    (
        "app/dashboard/settings/page.tsx",
        """        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="bg-primary absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl" />
          <div className="bg-[var(--st-tekshiruvda-bg)] absolute bottom-0 right-0 w-80 h-80 rounded-full blur-2xl" />
        </div>
""",
        "",
    ),
    # ----------------------------------------------------------- org-dashboard
    (
        "components/dashboard/org-dashboard.tsx",
        '      gradient: "from-indigo-500 to-violet-500",\n      bgColor: "bg-primary",\n      iconColor: "text-primary",',
        '      bgColor: "bg-primary-soft",\n      iconColor: "text-primary-soft-foreground",',
    ),
    (
        "components/dashboard/org-dashboard.tsx",
        '      gradient: "from-amber-500 to-orange-500",\n      bgColor: "bg-warning",\n      iconColor: "text-warning",',
        '      bgColor: "bg-warning-soft",\n      iconColor: "text-warning-soft-foreground",',
    ),
    (
        "components/dashboard/org-dashboard.tsx",
        '      gradient: "from-emerald-500 to-cyan-500",\n      bgColor: "bg-success",\n      iconColor: "text-success",',
        '      bgColor: "bg-success-soft",\n      iconColor: "text-success-soft-foreground",',
    ),
    (
        "components/dashboard/org-dashboard.tsx",
        '      gradient: "from-rose-500 to-pink-500",\n      bgColor: "bg-destructive",\n      iconColor: "text-destructive",',
        '      bgColor: "bg-destructive-soft",\n      iconColor: "text-destructive-soft-foreground",',
    ),
    (
        "components/dashboard/org-dashboard.tsx",
        '<Card className="bg-primary border-border">',
        '<Card className="bg-card">',
    ),
    (
        "components/dashboard/org-dashboard.tsx",
        '<div className="p-3 rounded-xl bg-primary">\n              <Building2 className="h-7 w-7 text-primary" />',
        '<div className="p-3 rounded-xl bg-primary-soft">\n              <Building2 className="h-7 w-7 text-primary-soft-foreground" />',
    ),
    # ------------------------------------------------------ organization-ratings
    (
        "components/dashboard/organization-ratings.tsx",
        '<div className="bg-success flex items-center gap-1 px-2 py-1 rounded-lg border border-success">\n                <TrendingUp className="w-3 h-3 text-success" />\n                <span className="text-xs font-medium text-success">',
        '<div className="flex items-center gap-1 rounded-lg bg-success-soft px-2 py-1">\n                <TrendingUp className="w-3 h-3 text-success-soft-foreground" />\n                <span className="text-xs font-medium text-success-soft-foreground">',
    ),
    # ------------------------------------------------------------ notifications
    (
        "components/dashboard/notifications/notification-constants.ts",
        '''  TASK_ASSIGNED: "bg-primary/10 text-primary",
  TASK_UPDATED: "bg-warning/10 text-warning",
  TASK_COMPLETED: "bg-accent/10 text-accent",
  TASK_OVERDUE: "bg-destructive/10 text-destructive",
  MESSAGE: "bg-primary text-primary",
  SYSTEM: "bg-muted text-muted-foreground",''',
        '''  TASK_ASSIGNED: "bg-primary-soft text-primary-soft-foreground",
  TASK_UPDATED: "bg-warning-soft text-warning-soft-foreground",
  TASK_COMPLETED: "bg-success-soft text-success-soft-foreground",
  TASK_OVERDUE: "bg-destructive-soft text-destructive-soft-foreground",
  MESSAGE: "bg-info-soft text-info-soft-foreground",
  SYSTEM: "bg-muted text-muted-foreground",''',
    ),
    (
        "app/dashboard/notifications/[id]/page.tsx",
        '<Badge className="bg-primary/10 text-primary">',
        '<Badge className="bg-primary-soft text-primary-soft-foreground">',
    ),
]

# soft fon ustidagi rangli chegaralarni olib tashlash
BORDER_STRIP = re.compile(
    r"(?<![\w-])border-(success|warning|destructive|primary|info)(?![\w-])"
)


def strip_borders(path):
    s = open(path, encoding="utf8").read()
    out_lines = []
    n = 0
    for line in s.splitlines(keepends=True):
        def fix(m):
            nonlocal n
            cls = m.group(1)
            for sem in ("success", "warning", "destructive", "primary", "info"):
                if f"bg-{sem}-soft" in cls and re.search(
                    r"(?<![\w-])border-" + sem + r"(?![\w-])", cls
                ):
                    cls = re.sub(r"(?<![\w-])border-" + sem + r"(?![\w-])", "", cls)
                    cls = re.sub(r"(?<![\w-])border(?![\w-])", "", cls)
                    cls = re.sub(r"\s{2,}", " ", cls).strip()
                    n += 1
            return '"' + cls + '"'

        out_lines.append(re.sub(r'"([^"\n]*)"', fix, line))
    if n:
        open(path, "w", encoding="utf8").write("".join(out_lines))
    return n


def main(apply):
    for path, old, new in EDITS:
        s = open(path, encoding="utf8").read()
        if old not in s:
            print(f"TOPILMADI  {path}: {old[:70]!r}")
            continue
        print(f"{'yozildi' if apply else 'topildi'}   {path}")
        if apply:
            open(path, "w", encoding="utf8").write(s.replace(old, new, 1))

    total = 0
    for path in [
        "components/chat/message-composer.tsx",
        "components/dashboard/appeals/ai-appeal-assistant.tsx",
        "components/dashboard/notifications/notification-actions.tsx",
        "components/dashboard/tasks/create/task-wizard.tsx",
        "components/dashboard/tasks/task-action-dialogs.tsx",
    ]:
        if apply:
            k = strip_borders(path)
            total += k
            if k:
                print(f"chegara olib tashlandi ({k})  {path}")
    print(f"\n{'YOZILDI' if apply else 'QURUQ ISHLASH'}: chegara {total}")


if __name__ == "__main__":
    main("--apply" in sys.argv)
