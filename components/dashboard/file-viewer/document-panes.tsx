"use client"

/**
 * HUJJAT PANELLARI — Word, Excel, PDF va matn fayllarini SAYT ICHIDA ko'rsatish.
 *
 * Nima uchun brauzerda, serverda emas: `.docx` va `.xlsx` ni server
 * tomonida PDF ga aylantirish LibreOffice talab qiladi va fuqaro
 * hujjati yana bir jarayondan o'tadi. Bu yerda fayl brauzerda
 * o'qiladi — hech qayerga yuborilmaydi.
 *
 * Kutubxonalar DINAMIK import qilinadi: `mammoth` va `xlsx` birgalikda
 * ~1 MB. Ular faqat foydalanuvchi haqiqatan hujjat ochganda yuklanadi,
 * sahifaning o'zi ularsiz ochiladi.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"

import { getExtension, SPREADSHEET_EXT, WORD_EXT, type ViewerFile } from "@/lib/file-preview"
import { cn } from "@/lib/utils"

/* ========================================================== UMUMIY HOLATLAR */

export function PaneLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function PaneError({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive-soft">
        <AlertCircle className="h-5 w-5 text-destructive-soft-foreground" aria-hidden />
      </span>
      <p className="max-w-sm text-sm text-destructive-soft-foreground">{message}</p>
    </div>
  )
}

/* ============================================================ FAYLNI OLISH */

type FetchState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T }

/**
 * Faylni baytlar sifatida yuklash.
 *
 * `AbortController` ataylab ishlatilmaydi: React StrictMode ishlab
 * chiqish rejimida komponentni ikki marta mount qiladi va birinchi
 * mount'ning tozalashi so'rovni bekor qilib, ma'lumot hech qachon
 * kelmay qolardi (loyihada xarita shu sabab bo'sh chiqqan edi).
 * O'rniga bekor qilingan mount natijani e'tiborsiz qoldiradi.
 */
function useFileBuffer(url: string): FetchState<ArrayBuffer> {
  // Natija QAYSI manzilga tegishli ekani birga saqlanadi. Shu tufayli
  // manzil o'zgarganda holatni effekt ichida `setState` bilan
  // tozalash shart emas — eskirgan natija o'z-o'zidan «yuklanmoqda»
  // ga aylanadi (effekt ichidagi setState kaskad render beradi).
  const [result, setResult] = useState<{ url: string; state: FetchState<ArrayBuffer> } | null>(null)

  useEffect(() => {
    let active = true

    fetch(url, { credentials: "omit" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.arrayBuffer()
      })
      .then((buffer) => {
        if (active) setResult({ url, state: { status: "ready", data: buffer } })
      })
      .catch(() => {
        if (!active) return
        setResult({
          url,
          state: {
            status: "error",
            message: "Faylni yuklab bo'lmadi. Tarmoqni tekshiring yoki faylni yuklab oling.",
          },
        })
      })

    return () => {
      active = false
    }
  }, [url])

  return result?.url === url ? result.state : { status: "loading" }
}

/* =============================================================== WORD (.docx) */

export function WordPane({ file }: { file: ViewerFile }) {
  const buffer = useFileBuffer(file.url)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (buffer.status !== "ready") return
    let active = true

    import("mammoth/mammoth.browser")
      .then((mammoth) => mammoth.convertToHtml({ arrayBuffer: buffer.data }))
      .then((result: { value: string }) => {
        if (active) setHtml(result.value || "<p>Hujjat bo'sh.</p>")
      })
      .catch(() => {
        if (active) setError("Hujjatni ochib bo'lmadi. Faylni yuklab olib ko'ring.")
      })

    return () => {
      active = false
    }
  }, [buffer])

  if (buffer.status === "loading") return <PaneLoading label="Hujjat yuklanmoqda…" />
  if (buffer.status === "error") return <PaneError message={buffer.message} />
  if (error) return <PaneError message={error} />
  if (html === null) return <PaneLoading label="Hujjat ochilmoqda…" />

  return (
    <div className="h-full overflow-auto bg-background p-4 sm:p-8">
      <article
        className="prose-docx mx-auto max-w-[820px] rounded-2xl bg-card p-5 text-sm leading-relaxed text-card-foreground shadow-sm sm:p-10"
        // mammoth faqat tanlangan teglarni chiqaradi (p, h1-h6, table,
        // ul/ol, strong, em) — skript yoki hodisa atributlari o'tmaydi.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

/* ========================================================== EXCEL (.xlsx/.csv) */

interface SheetData {
  names: string[]
  rows: string[][]
}

export function SpreadsheetPane({ file }: { file: ViewerFile }) {
  const buffer = useFileBuffer(file.url)
  const [sheet, setSheet] = useState<SheetData | null>(null)
  const [active, setActive] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const workbookRef = useRef<any>(null)

  useEffect(() => {
    if (buffer.status !== "ready") return
    let alive = true

    import("xlsx")
      .then((XLSX) => {
        const workbook = XLSX.read(buffer.data, { type: "array" })
        workbookRef.current = { XLSX, workbook }
        const names = workbook.SheetNames
        const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[names[0]], {
          header: 1,
          defval: "",
          raw: false,
        })
        if (alive) {
          setActive(0)
          setSheet({ names, rows })
        }
      })
      .catch(() => {
        if (alive) setError("Jadvalni ochib bo'lmadi. Faylni yuklab olib ko'ring.")
      })

    return () => {
      alive = false
    }
  }, [buffer])

  const selectSheet = (index: number) => {
    const ref = workbookRef.current
    if (!ref || !sheet) return
    const rows = ref.XLSX.utils.sheet_to_json(ref.workbook.Sheets[sheet.names[index]], {
      header: 1,
      defval: "",
      raw: false,
    }) as string[][]
    setActive(index)
    setSheet({ names: sheet.names, rows })
  }

  if (buffer.status === "loading") return <PaneLoading label="Jadval yuklanmoqda…" />
  if (buffer.status === "error") return <PaneError message={buffer.message} />
  if (error) return <PaneError message={error} />
  if (!sheet) return <PaneLoading label="Jadval ochilmoqda…" />

  const [headerRow, ...bodyRows] = sheet.rows
  const columnCount = Math.max(headerRow?.length ?? 0, ...bodyRows.map((row) => row.length), 1)

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {sheet.names.length > 1 && (
        // Varaqlar qatori 360px da sig'maydi — grid emas, gorizontal siljish.
        <div className="flex shrink-0 gap-2 overflow-x-auto p-3 sm:px-6">
          {sheet.names.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => selectSheet(index)}
              className={cn(
                "min-h-9 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors",
                index === active
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-soft text-primary-soft-foreground hover:bg-muted",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-xs">
          <thead>
            <tr>
              {Array.from({ length: columnCount }, (_, index) => (
                <th
                  key={index}
                  className="sticky top-0 z-10 bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {headerRow?.[index] || ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-card">
                {Array.from({ length: columnCount }, (_, colIndex) => (
                  <td key={colIndex} className="px-3 py-2 align-top tabular-nums text-foreground">
                    {row[colIndex] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {bodyRows.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Jadval bo'sh.</p>
        )}
      </div>
    </div>
  )
}

/* ================================================================ MATN / CSV */

export function TextPane({ file }: { file: ViewerFile }) {
  const [result, setResult] = useState<{ url: string; state: FetchState<string> } | null>(null)
  const url = file.url

  useEffect(() => {
    let active = true

    fetch(url, { credentials: "omit" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      })
      .then((text) => {
        if (active) setResult({ url, state: { status: "ready", data: text } })
      })
      .catch(() => {
        if (active) {
          setResult({ url, state: { status: "error", message: "Matnni yuklab bo'lmadi." } })
        }
      })

    return () => {
      active = false
    }
  }, [url])

  const state: FetchState<string> = result?.url === url ? result.state : { status: "loading" }

  if (state.status === "loading") return <PaneLoading label="Matn yuklanmoqda…" />
  if (state.status === "error") return <PaneError message={state.message} />

  return (
    <div className="h-full overflow-auto bg-background p-4 sm:p-8">
      <pre className="mx-auto max-w-[900px] overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-card p-4 font-mono text-xs leading-relaxed text-card-foreground shadow-sm sm:p-6">
        {state.data}
      </pre>
    </div>
  )
}

/* ======================================================================= PDF */

/**
 * PDF — blob orqali.
 *
 * To'g'ridan-to'g'ri `<iframe src={apiUrl}>` ishlamaydi: backend
 * `X-Frame-Options` yuboradi va boshqa domendagi sahifa ichida
 * ochilishni taqiqlaydi. Blob URL esa sahifaning o'z manbasida,
 * shuning uchun cheklov qo'llanmaydi.
 */
export function PdfPane({ file }: { file: ViewerFile }) {
  const [result, setResult] = useState<{ url: string; blobUrl?: string; error?: string } | null>(null)
  const url = file.url

  useEffect(() => {
    let active = true
    let createdUrl = ""

    fetch(url, { credentials: "omit" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      })
      .then((blob) => {
        if (!active) return
        createdUrl = URL.createObjectURL(
          blob.type ? blob : new Blob([blob], { type: "application/pdf" }),
        )
        setResult({ url, blobUrl: createdUrl })
      })
      .catch(() => {
        if (active) setResult({ url, error: "PDF ni ochib bo'lmadi. Faylni yuklab olib ko'ring." })
      })

    return () => {
      active = false
      // Blob URL brauzer xotirasida qoladi — bo'shatilmasa katta
      // PDF lar sahifa yopilgunga qadar RAM da turadi.
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [url])

  const current = result?.url === url ? result : null

  if (current?.error) return <PaneError message={current.error} />
  const blobUrl = current?.blobUrl
  if (!blobUrl) return <PaneLoading label="PDF yuklanmoqda…" />

  return (
    <object data={blobUrl} type="application/pdf" className="h-full w-full bg-background">
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Brauzeringiz PDF ni ichida ko'rsata olmadi.
        </p>
        <a
          href={blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Yangi oynada ochish
        </a>
      </div>
    </object>
  )
}

/* ============================================================ TANLASH MANTIQI */

/** Office fayli uchun qaysi panel ochilishini aniqlash. */
export function OfficePane({ file }: { file: ViewerFile }) {
  const ext = useMemo(() => getExtension(file.name) || getExtension(file.url), [file])

  if (WORD_EXT.has(ext)) return <WordPane file={file} />
  if (SPREADSHEET_EXT.has(ext)) return <SpreadsheetPane file={file} />

  // .doc, .ppt, .pptx — brauzerda ochib bo'lmaydigan eski/murakkab
  // formatlar. Yolg'on va'da bermaymiz: yuklab olish taklif qilinadi.
  return <UnsupportedPane file={file} ext={ext} />
}

export function UnsupportedPane({ file, ext }: { file: ViewerFile; ext?: string }) {
  const extension = ext || getExtension(file.name)
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-sm font-semibold uppercase text-muted-foreground">
        {extension || "fayl"}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Bu formatni brauzer ko'rsata olmaydi</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Faylni yuklab olib, kompyuteringizdagi dastur bilan oching.
        </p>
      </div>
      <a
        href={file.downloadUrl || file.url}
        download={file.name}
        className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_6px_20px_-6px_rgb(51_102_255_/_0.55)]"
      >
        Yuklab olish
      </a>
    </div>
  )
}
