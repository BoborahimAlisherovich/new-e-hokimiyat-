"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, UserRound, X } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { displayName, type ChatUserBrief } from "@/lib/api/chat-v2.api"
import { Avatar } from "./conversation-list"

/**
 * YANGI SUHBAT OYNASI («+» tugmasi)
 * =================================
 *
 * Ilgari yon ro'yxat TIZIMDAGI BARCHA XODIMNI ko'rsatardi: yuzta xodimli
 * hokimlikda bu «suhbatlar ro'yxati» emas, «telefon kitobi» edi va
 * haqiqiy yozishmalar orasida yo'qolib ketardi.
 *
 * Endi mantiq Telegramdagidek:
 *   yon ro'yxat  → faqat YOZISHILGAN suhbatlar
 *   «+» tugmasi  → butun xodimlar ro'yxati, tepasida qidiruv
 *
 * Ro'yxat LAVOZIM BO'YICHA guruhlanadi (Hokim, O'rinbosar, Mutaxassis,
 * Tashkilot rahbari, Mas'ul). Xodim ismini bilmasa ham, «kimga yozish
 * kerak» degan savolga javob topadi — davlat idorasida odam ko'pincha
 * aynan shunday izlaydi.
 */

const ROLE_LABEL: Record<string, string> = {
  HOKIM: "Hokim",
  HOKIM_YORDAMCHISI: "Hokim o'rinbosari",
  HOKIMLIK_MASUL: "Hokimlik mutaxassisi",
  TASHKILOT_RAHBARI: "Tashkilot rahbari",
  TASHKILOT_RAHBAR: "Tashkilot rahbari",
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Administrator",
}

/** Ro'yxatda guruhlar shu tartibda chiqadi */
const ROLE_ORDER = [
  "HOKIM",
  "HOKIM_YORDAMCHISI",
  "HOKIMLIK_MASUL",
  "TASHKILOT_RAHBARI",
  "TASHKILOT_RAHBAR",
  "TASHKILOT_MASUL",
  "ADMIN",
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  peers: ChatUserBrief[]
  /** Yozishilgan suhbatlar — ular «Yaqinda» bo'limiga chiqadi */
  recentIds?: string[]
  onSelect: (peerId: string) => void
}

export function NewChatDialog({ open, onOpenChange, peers, recentIds = [], onSelect }: Props) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }
    // Oyna ochilganda kursor darhol qidiruvda bo'lsin — foydalanuvchi
    // ko'p hollarda ismni yozib qidiradi.
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [open])

  const recentSet = useMemo(() => new Set(recentIds.map(String)), [recentIds])

  const { recent, groups, total } = useMemo(() => {
    const q = query.trim().toLowerCase()

    const matches = peers.filter((p) => {
      if (!q) return true
      const haystack = [
        displayName(p),
        p.full_name,
        p.position,
        ROLE_LABEL[p.role ?? ""] ?? p.role,
        p.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })

    const byName = (a: ChatUserBrief, b: ChatUserBrief) =>
      displayName(a).localeCompare(displayName(b), "uz")

    const recentList = q ? [] : matches.filter((p) => recentSet.has(String(p.id))).sort(byName)
    const rest = q ? matches : matches.filter((p) => !recentSet.has(String(p.id)))

    const map = new Map<string, ChatUserBrief[]>()
    for (const p of rest) {
      const key = p.role ?? "BOSHQA"
      const list = map.get(key)
      if (list) list.push(p)
      else map.set(key, [p])
    }

    const ordered = [...map.entries()].sort(([a], [b]) => {
      const ia = ROLE_ORDER.indexOf(a)
      const ib = ROLE_ORDER.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    for (const [, list] of ordered) list.sort(byName)

    return { recent: recentList, groups: ordered, total: matches.length }
  }, [peers, query, recentSet])

  const pick = (id: string) => {
    onSelect(String(id))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-left text-md">Yangi suhbat</DialogTitle>
        </DialogHeader>

        {/* Qidiruv — ro'yxat tepasida */}
        <div className="px-4 pb-3 pt-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <label htmlFor="new-chat-search" className="sr-only">
              Xodimlar orasidan qidirish
            </label>
            <input
              id="new-chat-search"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ism, lavozim yoki rol bo'yicha qidirish…"
              className="h-11 w-full rounded-[10px] bg-card pl-9.5 pr-10 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-muted-foreground focus:shadow-[inset_0_0_0_1.5px_var(--primary)] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  inputRef.current?.focus()
                }}
                aria-label="Qidiruvni tozalash"
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
          {total === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <UserRound className="h-7 w-7 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {query ? "Bunday xodim topilmadi" : "Xodimlar ro'yxati bo'sh"}
              </p>
            </div>
          ) : (
            <>
              {recent.length > 0 && (
                <Group label="Yaqinda">
                  {recent.map((p) => (
                    <PeerRow key={p.id} peer={p} onPick={pick} />
                  ))}
                </Group>
              )}

              {groups.map(([role, list]) => (
                <Group key={role} label={ROLE_LABEL[role] ?? "Boshqa xodimlar"}>
                  {list.map((p) => (
                    <PeerRow key={p.id} peer={p} onPick={pick} />
                  ))}
                </Group>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="sticky top-0 z-10 bg-surface-sunken px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  )
}

function PeerRow({
  peer,
  onPick,
}: {
  peer: ChatUserBrief
  onPick: (id: string) => void
}) {
  const name = displayName(peer)
  const subtitle = peer.position || ROLE_LABEL[peer.role ?? ""] || ""

  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(String(peer.id))}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          "hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <span className="relative shrink-0">
          <Avatar user={peer} size={40} />
          {peer.is_online && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success"
              aria-label="onlayn"
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>
          )}
        </span>
      </button>
    </li>
  )
}
