/**
 * INTERAKTIV XARITA YORLIQLARI (4 til)
 *
 * Ilgari bu jadval village-analytics.tsx ning 13-98 qatorlarida, komponent
 * bilan bir faylda turgan edi. Xarita endi ikki joyda ishlatiladi
 * (/dashboard/map va /dashboard/analytics), shuning uchun matnlar shu yerga
 * ko'chirildi. Umumiy `lib/i18n/uz.ts` va hokazolarga qo'shilmadi: u fayllar
 * `Translations` interfeysi bilan qat'iy bog'langan va boshqa modullar
 * tomonidan tahrirlanmoqda — xarita uchun alohida, kichik jadval xavfsizroq.
 */

import type { Language } from './types'

export interface MapLabels {
  title: string
  subtitle: string
  villages: string
  noData: string
  selectVillage: string
  selectedVillage: string
  listToggle: string
  mapToggle: string
  searchPlaceholder: string
  villageNotFound: string
  metric: string
  legendLow: string
  legendHigh: string
  legendNoData: string
  close: string
  loading: string
  statsUnavailable: string
  village: string
  /** Metrika yorliqlari — API maydonlari bilan bir xil tartibda */
  total: string
  inProgress: string
  awaitingApproval: string
  closed: string
  overdue: string
  appealsTotal: string
  appealsOpen: string
}

const uz: MapLabels = {
  title: 'Xatirchi tumani — qishloqlar kesimi',
  subtitle: 'Qishloqni tanlab, unga tegishli topshiriq va murojaat raqamlarini ko‘ring',
  villages: 'ta qishloq',
  noData: 'Ma’lumot yo‘q',
  selectVillage: 'Xaritadan qishloqni tanlang',
  selectedVillage: 'Tanlangan qishloq',
  listToggle: 'Ro‘yxat',
  mapToggle: 'Xarita',
  searchPlaceholder: 'Qishloq nomi bo‘yicha qidirish...',
  villageNotFound: 'Qishloq topilmadi',
  metric: 'Ko‘rsatkich',
  legendLow: 'kam',
  legendHigh: 'ko‘p',
  legendNoData: 'ma’lumot yo‘q',
  close: 'Yopish',
  loading: 'Yuklanmoqda...',
  statsUnavailable: 'Qishloqlar bo‘yicha statistika hozir mavjud emas — xarita faqat chegaralarni ko‘rsatmoqda.',
  village: 'Qishloq',
  total: 'Jami topshiriq',
  inProgress: 'Ijroda',
  awaitingApproval: 'Tasdiqlashda',
  closed: 'Nazoratdan yechilgan',
  overdue: 'Muddati kechikkan',
  appealsTotal: 'Jami murojaat',
  appealsOpen: 'Ochiq murojaat',
}

const uzCyrl: MapLabels = {
  title: 'Хатирчи тумани — қишлоқлар кесими',
  subtitle: 'Қишлоқни танлаб, унга тегишли топшириқ ва мурожаат рақамларини кўринг',
  villages: 'та қишлоқ',
  noData: 'Маълумот йўқ',
  selectVillage: 'Харитадан қишлоқни танланг',
  selectedVillage: 'Танланган қишлоқ',
  listToggle: 'Рўйхат',
  mapToggle: 'Харита',
  searchPlaceholder: 'Қишлоқ номи бўйича қидириш...',
  villageNotFound: 'Қишлоқ топилмади',
  metric: 'Кўрсаткич',
  legendLow: 'кам',
  legendHigh: 'кўп',
  legendNoData: 'маълумот йўқ',
  close: 'Ёпиш',
  loading: 'Юкланмоқда...',
  statsUnavailable: 'Қишлоқлар бўйича статистика ҳозир мавжуд эмас — харита фақат чегараларни кўрсатмоқда.',
  village: 'Қишлоқ',
  total: 'Жами топшириқ',
  inProgress: 'Ижрода',
  awaitingApproval: 'Тасдиқлашда',
  closed: 'Назоратдан ечилган',
  overdue: 'Муддати кечиккан',
  appealsTotal: 'Жами мурожаат',
  appealsOpen: 'Очиқ мурожаат',
}

const ru: MapLabels = {
  title: 'Хатырчинский район — по сёлам',
  subtitle: 'Выберите село, чтобы увидеть его задачи и обращения',
  villages: 'сёл',
  noData: 'Нет данных',
  selectVillage: 'Выберите село на карте',
  selectedVillage: 'Выбранное село',
  listToggle: 'Список',
  mapToggle: 'Карта',
  searchPlaceholder: 'Поиск по названию села...',
  villageNotFound: 'Село не найдено',
  metric: 'Показатель',
  legendLow: 'мало',
  legendHigh: 'много',
  legendNoData: 'нет данных',
  close: 'Закрыть',
  loading: 'Загрузка...',
  statsUnavailable: 'Статистика по сёлам пока недоступна — карта показывает только границы.',
  village: 'Село',
  total: 'Всего задач',
  inProgress: 'В работе',
  awaitingApproval: 'На утверждении',
  closed: 'Снято с контроля',
  overdue: 'Просрочено',
  appealsTotal: 'Всего обращений',
  appealsOpen: 'Открытые обращения',
}

const en: MapLabels = {
  title: 'Xatirchi district — by village',
  subtitle: 'Select a village to see its tasks and appeals',
  villages: 'villages',
  noData: 'No data',
  selectVillage: 'Select a village on the map',
  selectedVillage: 'Selected village',
  listToggle: 'List',
  mapToggle: 'Map',
  searchPlaceholder: 'Search by village name...',
  villageNotFound: 'Village not found',
  metric: 'Metric',
  legendLow: 'low',
  legendHigh: 'high',
  legendNoData: 'no data',
  close: 'Close',
  loading: 'Loading...',
  statsUnavailable: 'Per-village statistics are unavailable right now — the map shows boundaries only.',
  village: 'Village',
  total: 'Tasks total',
  inProgress: 'In progress',
  awaitingApproval: 'Awaiting approval',
  closed: 'Closed',
  overdue: 'Overdue',
  appealsTotal: 'Appeals total',
  appealsOpen: 'Open appeals',
}

const MAP_LABELS: Record<Language, MapLabels> = {
  uz,
  'uz-cyrl': uzCyrl,
  ru,
  en,
}

export function getMapLabels(language: Language | string | undefined): MapLabels {
  return MAP_LABELS[(language as Language) ?? 'uz'] ?? uz
}

/**
 * Qishloq nomini tanlangan tilga qarab qaytaradi. Nomlar build vaqtida
 * ikki alifboda tayyorlangan (lib/translit.ts ga qarang), shuning uchun
 * klientda hech narsa o'girilmaydi.
 */
export function villageName(
  village: { name_latn: string; name_cyrl: string },
  language: Language | string | undefined,
): string {
  return language === 'uz' || language === 'en' ? village.name_latn : village.name_cyrl
}
