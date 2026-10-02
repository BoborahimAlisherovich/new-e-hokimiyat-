import { redirect } from "next/navigation"

/**
 * /login — OLIB TASHLANDI.
 *
 * Eski kirish sahifasi o'rniga `/kirish` ishlaydi. Eski xatcho'plar va
 * tashqi havolalar 404 bermasligi uchun bu manzil bosh sahifaga qaytaradi.
 *
 * Bu papkani (`app/login`) butunlay o'chirib tashlash mumkin — u holda
 * `/login` oddiy 404 bo'ladi. Fayl faqat orqaga moslik uchun qoldirilgan.
 */
export default function LoginRemoved() {
  redirect("/")
}
