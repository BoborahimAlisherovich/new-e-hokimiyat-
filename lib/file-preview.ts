/**
 * FAYL KO'RGICHI — umumiy yordamchi funksiyalar.
 *
 * Bu yerda faqat sof mantiq: fayl turini aniqlash, hajmni formatlash,
 * mijoz tomonidagi chegaralar. React yo'q — shuning uchun testlash ham,
 * serverda ishlatish ham mumkin.
 *
 * Chegaralar `backend/core/file_validators.py` bilan MOS bo'lishi shart.
 * Mos kelmasa foydalanuvchi faylni yuklaydi-yu, server 400 qaytaradi —
 * eng yomon xato turi: sabab ko'rinmaydi.
 */

/** Bitta fayl uchun yuqori chegara — backend bilan bir xil (40 MB). */
export const MAX_UPLOAD_SIZE = 40 * 1024 * 1024

/** Bitta so'rovda yuklash mumkin bo'lgan fayllar soni. */
export const MAX_UPLOAD_FILES = 10

/**
 * Butunlay taqiqlangan kengaytmalar.
 * APK va boshqa o'rnatiladigan paketlar — hokimlik sayti ilova
 * tarqatish kanaliga aylanmasligi uchun.
 */
export const BLOCKED_EXTENSIONS = [
  "exe", "js", "sh", "bat", "cmd", "msi", "scr",
  "php", "html", "htm", "svg",
  "jar", "vbs", "ps1", "com", "dll", "deb", "app",
  "apk", "apks", "xapk", "aab", "ipa",
] as const

/** Ruxsat etilgan kengaytmalar — backend `ALLOWED_EXTENSIONS` bilan bir xil. */
export const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp", "heic", "gif",
  "mp4", "webm", "mov",
  "mp3", "m4a", "ogg", "wav",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
] as const

/** Ko'rgich qaysi panelni ochishini bildiradi. */
export type PreviewKind = "image" | "video" | "audio" | "pdf" | "text" | "office" | "other"

/** Ko'rgichga beriladigan fayl. */
export interface ViewerFile {
  id: string | number
  /** Ko'rsatiladigan nom */
  name: string
  /** Ko'rish uchun manzil */
  url: string
  /** Yuklab olish manzili (berilmasa `url` ishlatiladi) */
  downloadUrl?: string
  size?: number
  kind?: PreviewKind
  mimeType?: string
  /** Ikkinchi darajali izoh: kim yukladi, qachon */
  meta?: string
}

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "gif", "bmp", "avif"])
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "mkv", "avi", "m4v"])
const AUDIO_EXT = new Set(["mp3", "m4a", "ogg", "oga", "wav", "weba", "opus"])
const TEXT_EXT = new Set(["txt", "csv", "log", "md"])
const OFFICE_EXT = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"])

/** SheetJS bilan jadval sifatida ochiladigan formatlar. */
export const SPREADSHEET_EXT = new Set(["xls", "xlsx", "csv"])

/** mammoth bilan matn sifatida ochiladigan formatlar. */
export const WORD_EXT = new Set(["docx"])

/** Fayl nomidan kichik harfli kengaytma ('pdf'). Topilmasa bo'sh satr. */
export function getExtension(fileName: string): string {
  const clean = String(fileName ?? "").split(/[?#]/)[0]
  const dot = clean.lastIndexOf(".")
  if (dot < 0 || dot === clean.length - 1) return ""
  return clean.slice(dot + 1).toLowerCase()
}

/**
 * Fayl saytda qanday ochilishini aniqlash.
 *
 * Backend `preview_kind` yuborsa o'sha ustun turadi — u faylning
 * haqiqiy MIME turini biladi. Yubormasa nom va MIME dan aniqlanadi.
 */
export function detectPreviewKind(file: {
  name?: string
  kind?: PreviewKind
  mimeType?: string
  url?: string
}): PreviewKind {
  if (file.kind) return file.kind

  const mime = String(file.mimeType ?? "").toLowerCase()
  const ext = getExtension(file.name ?? "") || getExtension(file.url ?? "")

  if (mime.startsWith("image/") || IMAGE_EXT.has(ext)) return "image"
  if (mime.startsWith("video/") || VIDEO_EXT.has(ext)) return "video"
  if (mime.startsWith("audio/") || AUDIO_EXT.has(ext)) return "audio"
  if (mime === "application/pdf" || ext === "pdf") return "pdf"
  if (mime.startsWith("text/") || TEXT_EXT.has(ext)) return "text"
  if (OFFICE_EXT.has(ext)) return "office"
  if (/wordprocessingml|spreadsheetml|presentationml|msword|ms-excel|ms-powerpoint/.test(mime)) {
    return "office"
  }
  return "other"
}

/** Fayl hajmi — odam o'qiydigan ko'rinishda. Noma'lum bo'lsa bo'sh satr. */
export function formatBytes(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) return ""
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** power
  return `${value >= 10 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`
}

/** Fayl turi uchun qisqa o'zbekcha yorliq. */
export function kindLabel(kind: PreviewKind): string {
  const labels: Record<PreviewKind, string> = {
    image: "Rasm",
    video: "Video",
    audio: "Audio",
    pdf: "PDF hujjat",
    text: "Matn",
    office: "Hujjat",
    other: "Fayl",
  }
  return labels[kind]
}

/**
 * Yuklashdan OLDIN faylni tekshirish.
 *
 * Server baribir qayta tekshiradi — bu faqat foydalanuvchiga darhol
 * javob berish uchun (40 MB faylni yuklab, keyin rad javobini olish
 * eng yomon tajriba).
 *
 * @returns Xato matni (o'zbekcha) yoki `null` — hammasi joyida.
 */
export function validateUpload(file: File): string | null {
  const ext = getExtension(file.name)

  if (!ext) {
    return `«${file.name}» faylining kengaytmasi yo'q — yuklab bo'lmaydi.`
  }
  if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `«${file.name}» xavfsizlik sababli qabul qilinmaydi (.${ext} taqiqlangan).`
  }
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `«${file.name}» qo'llab-quvvatlanmaydi. Ruxsat etilgan: ${ALLOWED_EXTENSIONS.join(", ")}.`
  }
  if (file.size <= 0) {
    return `«${file.name}» fayli bo'sh.`
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return `«${file.name}» juda katta (${formatBytes(file.size)}). Chegara — ${formatBytes(MAX_UPLOAD_SIZE)}.`
  }
  return null
}

/**
 * Bir nechta faylni tekshirish.
 *
 * @returns Xatolar ro'yxati. Bo'sh bo'lsa — hammasi joyida.
 */
export function validateUploads(files: File[]): string[] {
  const errors: string[] = []
  if (files.length > MAX_UPLOAD_FILES) {
    errors.push(`Bir vaqtda ko'pi bilan ${MAX_UPLOAD_FILES} ta fayl yuklash mumkin.`)
  }
  for (const file of files) {
    const error = validateUpload(file)
    if (error) errors.push(error)
  }
  return errors
}

/** Turli API javoblaridan yagona `ViewerFile` yasash. */
export function toViewerFile(raw: any, fallbackIndex = 0): ViewerFile | null {
  if (!raw) return null
  const url = raw.file_url || raw.file || raw.url || ""
  if (!url) return null

  const name = raw.file_name || raw.name || String(url).split("/").pop() || `Fayl ${fallbackIndex + 1}`
  return {
    id: raw.id ?? fallbackIndex,
    name,
    url,
    downloadUrl: raw.download_url || undefined,
    size: typeof raw.file_size === "number" ? raw.file_size : undefined,
    kind: raw.preview_kind || undefined,
    mimeType: raw.content_type || raw.mime_type || undefined,
  }
}
