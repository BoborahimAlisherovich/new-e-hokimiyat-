/**
 * `mammoth/mammoth.browser` uchun tip e'loni.
 *
 * mammoth paketi tiplarni faqat Node kirish nuqtasi (`mammoth`) uchun
 * beradi. Brauzer qurilmasi (`mammoth.browser`) — alohida fayl va
 * uning `.d.ts` si yo'q. Bizga kerak bo'lgan yagona funksiya —
 * `convertToHtml`, shuning uchun to'liq API emas, ishlatiladigan
 * qismi e'lon qilinadi.
 */
declare module "mammoth/mammoth.browser" {
  export interface ConvertResult {
    /** Hosil bo'lgan HTML */
    value: string
    /** Ogohlantirishlar (qo'llab-quvvatlanmagan uslublar va h.k.) */
    messages: Array<{ type: string; message: string }>
  }

  export interface ConvertInput {
    arrayBuffer: ArrayBuffer
  }

  export function convertToHtml(input: ConvertInput): Promise<ConvertResult>
  export function extractRawText(input: ConvertInput): Promise<ConvertResult>
}
