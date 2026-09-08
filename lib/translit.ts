/**
 * KIRILL → LOTIN TRANSLITERATSIYA — YAGONA MANBA
 *
 * Bu jadval ilgari components/dashboard/analytics/village-analytics.tsx
 * ichida (35 KB'lik komponentning bir qismi sifatida) yozilgan edi va
 * har render'da qishloq nomlari qaytadan o'girilardi. Endi:
 *   - jadval shu yerda, bir joyda turadi;
 *   - qishloq nomlari esa umuman klientda o'girilmaydi — ular
 *     `scripts/build-map.mjs` da build vaqtida bir marta o'girilib,
 *     `public/geo/xatirchi-villages.paths.json` ga `name_latn` va
 *     `name_cyrl` sifatida yozib qo'yiladi.
 *
 * DIQQAT: scripts/build-map.mjs ichidagi CYR_TO_LAT jadvali shu bilan
 * bir xil bo'lishi kerak. Bu yerni o'zgartirsangiz, skriptni ham
 * yangilab, geometriyani qayta generatsiya qiling.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sh', ъ: "'", ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'J', З: 'Z',
  И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R',
  С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'X', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh',
  Щ: 'Sh', Ъ: "'", Ы: 'I', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
  Ў: "O'", Қ: 'Q', Ғ: "G'", Ҳ: 'H',
}

/** Kirill matnni lotinga o'giradi; lotin harflar o'zgarmaydi. */
export function cyrillicToLatin(text: string): string {
  let out = ''
  for (const char of text) out += CYRILLIC_TO_LATIN[char] ?? char
  return out
}

/** Birinchi harfni katta qiladi. */
export function capitalize(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Tire/pastki chiziqlarni bo'shliqqa aylantirib, nomni tozalaydi. */
export function tidyName(text: string): string {
  return capitalize(text.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim())
}

/**
 * Qidiruv uchun normallashtirish: registr, apostrof turlari va kirill/lotin
 * farqini yo'q qiladi, shunda "Bog'ishamol" ni "bogishamol" deb ham,
 * "Боғишамол" deb ham topish mumkin.
 */
export function searchKey(text: string): string {
  return cyrillicToLatin(text)
    .toLowerCase()
    .replace(/['’`ʻ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}
