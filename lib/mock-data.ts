// Mock data for the government task management system

export type UserStatus = "DRAFT" | "KUTILMOQDA" | "FAOL" | "BLOKLANGAN" | "ARXIV"
export type TaskStatus =
  | "YANGI"
  | "IJRODA"
  | "BAJARILDI"
  | "QAYTA_IJROGA_YUBORILDI"
  | "MUDDATI_KECH"
  | "BAJARILMADI"
  | "NAZORATDAN_YECHILDI"
export type TaskPriority = "MUHIM_SHOSHILINCH" | "MUHIM" | "SHOSHILINCH_EMAS" | "ODDIY"
export type UserRole = "TUMAN_HOKIMI" | "HOKIMLIK_MASUL" | "TASHKILOT_RAHBAR" | "TASHKILOT_MASUL" | "ADMIN"
export type CabinetType = "HOKIMLIK" | "TASHKILOT" | "ADMIN"

export type Sector =
  | "SOGLIQNI_SAQLASH"
  | "BANDLIK_MEHNAT"
  | "TALIM"
  | "IJTIMOIY_HIMOYA"
  | "ADLIYA"
  | "EKOLOGIYA"
  | "SUBSIDIYA"
  | "OILA_BOLALAR"
  | "KOCHMAS_MULK"
  | "FUQAROLIK"
  | "DAVLAT_AKTIVLARI"
  | "IQTISODIYOT_BIZNES"
  | "YOSHLAR"
  | "TRANSPORT"
  | "AXBOROT_ALOQA"
  | "GEOLOGIYA"
  | "PENSIYA"
  | "MADANIYAT_TURIZM_SPORT"
  | "KOMMUNAL_SOHA"
  | "SOLIQLAR"

export interface User {
  id: string
  pnfl: string
  firstName: string
  lastName: string
  middleName: string
  phone?: string
  email?: string
  role: UserRole
  organizationId?: string
  position: string
  status: UserStatus
  oneidConnected: boolean
  avatar?: string
  createdAt: string
  activatedAt?: string
  lastLoginAt?: string
  department?: string
  address?: string
}

export interface Organization {
  id: string
  name: string
  sector: Sector
  parentOrgId?: string
  isActive: boolean
  tasksCount: number
  completedTasks: number
  rating: number
  address?: string
  phone?: string
  email?: string
  website?: string
  head?: string
  establishedYear?: number
}

export interface Task {
  id: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  sector: Sector
  deadline: string
  createdAt: string
  createdBy: string
  organizations: string[]
  progress?: number
  assignedTo?: string
  documents?: string[]
  budget?: string
  location?: { lat: number; lng: number }
  attachments?: string[]
}

export interface TaskExecution {
  id: string
  taskId: string
  executedBy: string
  actionType:
    | "IJROGA_OLINDI"
    | "HISOBOT_TOPSHIRILDI"
    | "QAYTA_YUBORILDI"
    | "NAZORATDAN_YECHILDI"
    | "MUDDAT_UZAYTIRISH_SOROVI"
  comment?: string
  attachments?: string[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  taskId: string
  senderId: string
  type: "text" | "file" | "audio" | "system"
  content: string
  attachments?: string[]
  createdAt: string
}

export interface Notification {
  id: string
  type: "task_new" | "task_deadline" | "task_completed" | "task_overdue" | "user_added" | "system"
  title: string
  description: string
  read: boolean
  createdAt: string
  taskId?: string
  userId?: string
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  details: string
  targetType: "user" | "task" | "organization"
  targetId: string
  createdAt: string
}

export interface SystemSettings {
  telegramBotToken: string
  telegramBotUsername: string
  emailSmtpHost: string
  emailSmtpPort: number
  emailSenderAddress: string
}

export const roleLabels: Record<UserRole, string> = {
  TUMAN_HOKIMI: "Tuman hokimi",
  HOKIMLIK_MASUL: "Hokimlik mas'uli",
  TASHKILOT_RAHBAR: "Tashkilot rahbari",
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Administrator",
}

export const roleCabinet: Record<UserRole, CabinetType> = {
  TUMAN_HOKIMI: "HOKIMLIK",
  HOKIMLIK_MASUL: "HOKIMLIK",
  TASHKILOT_RAHBAR: "TASHKILOT",
  TASHKILOT_MASUL: "TASHKILOT",
  ADMIN: "ADMIN",
}

export const sectorLabels: Record<Sector, string> = {
  SOGLIQNI_SAQLASH: "Sog'liqni saqlash",
  BANDLIK_MEHNAT: "Bandlik va mehnat",
  TALIM: "Ta'lim",
  IJTIMOIY_HIMOYA: "Ijtimoiy himoya",
  ADLIYA: "Adliya",
  EKOLOGIYA: "Ekologiya",
  SUBSIDIYA: "Subsidiya",
  OILA_BOLALAR: "Oila va bolalar",
  KOCHMAS_MULK: "Ko'chmas mulk",
  FUQAROLIK: "Fuqarolik",
  DAVLAT_AKTIVLARI: "Davlat aktivlari",
  IQTISODIYOT_BIZNES: "Iqtisodiyot va biznes",
  YOSHLAR: "Yoshlar",
  TRANSPORT: "Transport",
  AXBOROT_ALOQA: "Axborot va aloqa",
  GEOLOGIYA: "Geologiya",
  PENSIYA: "Pensiya",
  MADANIYAT_TURIZM_SPORT: "Madaniyat, turizm va sport",
  KOMMUNAL_SOHA: "Kommunal soha",
  SOLIQLAR: "Soliqlar",
}

export const sectorColors: Record<Sector, string> = {
  SOGLIQNI_SAQLASH: "hsl(0, 70%, 50%)",
  BANDLIK_MEHNAT: "hsl(25, 80%, 55%)",
  TALIM: "hsl(45, 85%, 50%)",
  IJTIMOIY_HIMOYA: "hsl(85, 60%, 50%)",
  ADLIYA: "hsl(160, 60%, 45%)",
  EKOLOGIYA: "hsl(120, 50%, 45%)",
  SUBSIDIYA: "hsl(180, 60%, 45%)",
  OILA_BOLALAR: "hsl(200, 70%, 50%)",
  KOCHMAS_MULK: "hsl(220, 60%, 55%)",
  FUQAROLIK: "hsl(240, 60%, 50%)",
  DAVLAT_AKTIVLARI: "hsl(260, 55%, 55%)",
  IQTISODIYOT_BIZNES: "hsl(280, 50%, 55%)",
  YOSHLAR: "hsl(300, 50%, 50%)",
  TRANSPORT: "hsl(320, 55%, 50%)",
  AXBOROT_ALOQA: "hsl(340, 60%, 50%)",
  GEOLOGIYA: "hsl(30, 50%, 45%)",
  PENSIYA: "hsl(60, 50%, 45%)",
  MADANIYAT_TURIZM_SPORT: "hsl(150, 55%, 45%)",
  KOMMUNAL_SOHA: "hsl(190, 60%, 50%)",
  SOLIQLAR: "hsl(210, 65%, 50%)",
}

export const statusLabels: Record<UserStatus, string> = {
  DRAFT: "Draft",
  KUTILMOQDA: "Kutilmoqda",
  FAOL: "Faol",
  BLOKLANGAN: "Bloklangan",
  ARXIV: "Arxiv",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  YANGI: "Yangi",
  IJRODA: "Ijroda",
  BAJARILDI: "Bajarildi",
  QAYTA_IJROGA_YUBORILDI: "Қайта ижрога юборилди",
  MUDDATI_KECH: "Муддати кечикган",
  BAJARILMADI: "Бажарилмади",
  NAZORATDAN_YECHILDI: "Назоратдан ечилди",
};

export const priorityLabels: Record<TaskPriority, string> = {
  MUHIM_SHOSHILINCH: "1. MUHIM VA SHOSHILINCH",
  MUHIM: "2. MUHIM, LEKIN SHOSHILINCH EMAS",
  SHOSHILINCH_EMAS: "3. SHOSHILINCH, LEKIN MUHIM EMAS",
  ODDIY: "4. MUHIM EMAS VA SHOSHILINCH EMAS",
}

export const priorityDeadlines: Record<TaskPriority, number> = {
  MUHIM_SHOSHILINCH: 1, // 1 kun
  MUHIM: 3, // 3 kun
  SHOSHILINCH_EMAS: 5, // 5 kun
  ODDIY: 7, // 7 kun
}

export const priorityDescriptions: Record<TaskPriority, string> = {
  MUHIM_SHOSHILINCH: "darhol bajarilishi lozim bo'lgan masalalar, favqulodda holatlar va jamoatchilikka ta'siri yuqori bo'lgan vaziyatlar",
  MUHIM: "strategik va tizimli masalalar, reja asosida bajariladi, o'z vaqtida bajarilmasa, keyinchalik favqulodda holatga aylanishi mumkin",
  SHOSHILINCH_EMAS: "texnik va operatsion xarakterdagi ishlar, vakolatli mas'ullarga topshiriladi, hokim aralashuvi talab etilmaydi",
  ODDIY: "ikkilamchi va fon rejimidagi ishlar, minimal nazorat ostida bo'ladi, umumiy ish yuklamasini tahlil qilishda hisobga olinadi",
}

export const mockUsers: User[] = [
  {
    id: "1",
    pnfl: "12345678901234",
    firstName: "Қодиржон",
    lastName: "Раҳимов",
    middleName: "Абдуллаевич",
    phone: "+998901234567",
    email: "hokim@hokimiyat.uz",
    role: "TUMAN_HOKIMI",
    position: "Туман ҳокими",
    organizationId: "1",
    department: "Бошқарув бўлими",
    status: "FAOL",
    oneidConnected: true,
    avatar: "",
    createdAt: "2024-01-15T09:00:00Z",
    activatedAt: "2024-01-15T10:00:00Z",
    lastLoginAt: "2024-01-20T08:30:00Z",
    address: "Самарқанд вилояти"
  },
  {
    id: "2",
    pnfl: "12345678901235",
    firstName: "Азиза",
    lastName: "Иброҳимова",
    middleName: "Қодировна",
    phone: "+998902345678",
    email: "masul@hokimiyat.uz",
    role: "HOKIMLIK_MASUL",
    position: "Ҳокимлик масъули",
    organizationId: "1",
    department: "Ижтимоий соҳа бўлими",
    status: "FAOL",
    oneidConnected: true,
    avatar: "",
    createdAt: "2024-01-10T08:00:00Z",
    activatedAt: "2024-01-10T09:00:00Z",
    lastLoginAt: "2024-01-20T07:45:00Z",
    address: "Самарқанд вилояти"
  },
  {
    id: "3",
    pnfl: "12345678901236",
    firstName: "Сардор",
    lastName: "Акрамов",
    middleName: "Баҳодирович",
    phone: "+998903456789",
    email: "rahbar@hokimiyat.uz",
    role: "TASHKILOT_RAHBAR",
    position: "Ташкилот раҳбари",
    organizationId: "2",
    department: "Амалий ишлар бошқармаси",
    status: "FAOL",
    oneidConnected: true,
    avatar: "",
    createdAt: "2024-01-12T10:00:00Z",
    activatedAt: "2024-01-12T11:00:00Z",
    lastLoginAt: "2024-01-19T16:20:00Z",
    address: "Самарқанд шаҳар, Буюк Ичмон кўчаси, 140000"
  },
  {
    id: "4",
    pnfl: "12345678901237",
    firstName: "Севара",
    lastName: "Усмонова",
    middleName: "Ботировна",
    phone: "+998904567890",
    email: "masul@hokimiyat.uz",
    role: "TASHKILOT_MASUL",
    position: "Ташкилот масъули",
    organizationId: "3",
    department: "Молия бўлими",
    status: "FAOL",
    oneidConnected: true,
    avatar: "",
    createdAt: "2024-01-08T09:00:00Z",
    activatedAt: "2024-01-08T10:00:00Z",
    lastLoginAt: "2024-01-18T14:30:00Z",
    address: "Самарқанд вилояти"
  },
  {
    id: "5",
    pnfl: "12345678901238",
    firstName: "Жасур",
    lastName: "Холиков",
    middleName: "Абдулла ўғли",
    phone: "+998905678901",
    email: "ijrochi@hokimiyat.uz",
    role: "TASHKILOT_MASUL",
    position: "Ижрочи",
    organizationId: "4",
    department: "Ижро бўлими",
    status: "FAOL",
    oneidConnected: true,
    avatar: "",
    createdAt: "2024-01-05T08:00:00Z",
    activatedAt: "2024-01-05T09:00:00Z",
    lastLoginAt: "2024-01-17T13:15:00Z",
    address: "Самарқанд вилояти"
  },
  {
    id: "6",
    pnfl: "67890123456789",
    firstName: "Шерзод",
    lastName: "Рахимов",
    middleName: "Умидович",
    phone: "+998906789012",
    email: "s.rahimov@hokimiyat.uz",
    role: "ADMIN",
    position: "Тизим администратори",
    organizationId: "1",
    department: "Бошқарув бўлими",
    status: "FAOL",
    oneidConnected: true,
    avatar: "",
    createdAt: "2024-01-01T09:00:00Z",
    activatedAt: "2024-01-01T10:00:00Z",
    lastLoginAt: "2024-01-20T08:00:00Z",
    address: "Тошкент шаҳар, Яшнабад тумани, 100000"
  },
  {
    id: "7",
    pnfl: "78901234567890",
    firstName: "Муҳаммад",
    lastName: "Усмонов",
    middleName: "Алимжон",
    phone: "+998907890123",
    email: "m.usmonov@hokimiyat.uz",
    role: "TASHKILOT_MASUL",
    position: "Ташкилот раҳбари",
    organizationId: "5",
    department: "Иқтисодиёт бўлими",
    status: "FAOL",
    oneidConnected: true,
    avatar: "",
    createdAt: "2024-01-03T08:00:00Z",
    activatedAt: "2024-01-03T09:00:00Z",
    lastLoginAt: "2024-01-19T11:20:00Z",
    address: "Қорақалпоғ вилояти, Қорақалпоғ шаҳар, 150000"
  },
  {
    id: "8",
    pnfl: "89012345678901",
    firstName: "Зухра",
    lastName: "Сиддиқов",
    middleName: "Баҳромович",
    phone: "+998908901234",
    email: "z.siddikov@hokimiyat.uz",
    role: "TASHKILOT_MASUL",
    position: "Туман ҳокимлиги ўринба",
    organizationId: "3",
    department: "Соғлиқ бўлими",
    status: "FAOL",
    oneidConnected: true,
    createdAt: "2024-01-02T16:00:00Z",
    activatedAt: "2024-01-02T14:00:00Z",
    lastLoginAt: "2024-01-20T06:30:00Z"
  }
]

export const mockOrganizations: Organization[] = [
  {
    id: "1",
    name: "Тошкент шаҳар ҳокимлиги",
    sector: "IQTISODIYOT_BIZNES",
    isActive: true,
    tasksCount: 45,
    completedTasks: 38,
    rating: 94,
    address: "Тошкент шаҳар, Мирзо Улуг'бек кўчаси, 100000",
    phone: "+99871234567",
    email: "tashkent@hokimiyat.uz",
    website: "tashkent.hokimiyat.uz",
    head: "Тўхтаев Абдуллоҳ Ҳамидович",
    establishedYear: 1992
  },
  {
    id: "2",
    name: "Самарқанд шаҳар ҳокимлиги",
    sector: "IQTISODIYOT_BIZNES",
    isActive: true,
    tasksCount: 32,
    completedTasks: 28,
    rating: 88,
    address: "Самарқанд шаҳар, Буюк Ичмон кўчаси, 140000",
    phone: "+99862234567",
    email: "samarkand@hokimiyat.uz",
    website: "samarkand.hokimiyat.uz",
    head: "Қодиров Баҳодир Ҳамидович",
    establishedYear: 1995
  },
  {
    id: "3",
    name: "Бухоро шаҳар ҳокимлиги",
    sector: "KOMMUNAL_SOHA",
    isActive: true,
    tasksCount: 28,
    completedTasks: 25,
    rating: 89,
    address: "Бухоро шаҳар, Марказ кўчаси, 200100",
    phone: "+99865434567",
    email: "bukhoro@hokimiyat.uz",
    website: "bukhoro.hokimiyat.uz",
    head: "Солиҳиддинов Азиз",
    establishedYear: 1993
  },
  {
    id: "4",
    name: "Фарғона вилояти ҳокимлиги",
    sector: "KOMMUNAL_SOHA",
    isActive: true,
    tasksCount: 35,
    completedTasks: 30,
    rating: 86,
    address: "Фарғона шаҳар, Ислом Каримов кўчаси, 710000",
    phone: "+99873434567",
    email: "ferghana@hokimiyat.uz",
    website: "ferghana.hokimiyat.uz",
    head: "Умаров Ботир",
    establishedYear: 1994
  },
  {
    id: "5",
    name: "Наманган вилояти ҳокимлиги",
    sector: "KOMMUNAL_SOHA",
    isActive: true,
    tasksCount: 22,
    completedTasks: 18,
    rating: 82,
    address: "Наманган шаҳар, Ал Хоразмий кўчаси, 160000",
    phone: "+99869434567",
    email: "namangan@hokimiyat.uz",
    website: "namangan.hokimiyat.uz",
    head: "Эркинов Баҳодир",
    establishedYear: 1996
  },
  {
    id: "6",
    name: "Андижон вилояти ҳокимлиги",
    sector: "KOMMUNAL_SOHA",
    isActive: true,
    tasksCount: 18,
    completedTasks: 17,
    rating: 94,
    address: "Андижон шаҳар, Бобур кўчаси, 170000",
    phone: "+99874234567",
    email: "andijan@hokimiyat.uz",
    website: "andijan.hokimiyat.uz",
    head: "Юлдашов Муҳаммад",
    establishedYear: 1997
  },
  {
    id: "7",
    name: "Хоразм вилояти ҳокимлиги",
    sector: "KOMMUNAL_SOHA",
    isActive: true,
    tasksCount: 25,
    completedTasks: 20,
    rating: 80,
    address: "Хоразм шаҳар, Шарқий Раҳимов кўчаси, 180000",
    phone: "+99867434567",
    email: "khorezm@hokimiyat.uz",
    website: "khorezm.hokimiyat.uz",
    head: "Раҳимов Қудратқон",
    establishedYear: 1992
  },
  {
    id: "8",
    name: "Қорақалпоғ вилояти ҳокимлиги",
    sector: "KOMMUNAL_SOHA",
    isActive: true,
    tasksCount: 15,
    completedTasks: 12,
    rating: 83,
    address: "Қорақалпоғ шаҳар, Мустақиллик кўчаси, 150000",
    phone: "+99866634567",
    email: "qoraqalpog@hokimiyat.uz",
    website: "qoraqalpog.hokimiyat.uz",
    head: "Тўраев Жамшед",
    establishedYear: 1998
  },
  {
    id: "9",
    name: "Transport bo'limi",
    sector: "TRANSPORT",
    isActive: true,
    tasksCount: 22,
    completedTasks: 18,
    rating: 82,
  },
  {
    id: "10",
    name: "Soliq inspeksiyasi",
    sector: "SOLIQLAR",
    isActive: true,
    tasksCount: 30,
    completedTasks: 27,
    rating: 90,
  }
]

export const mockTasks: Task[] = [
  {
    id: "1",
    title: "Тошкент шаҳар ҳокимлиги биноси таъмириш лойиҳаси",
    description: "Тошкент шаҳар ҳокимлиги биносини қайта таъмириш, замоналарни алмаштириш, энергия тежамли ишларини амалга ошириш",
    priority: "MUHIM_SHOSHILINCH",
    status: "IJRODA",
    sector: "IQTISODIYOT_BIZNES",
    deadline: "2026-01-25",
    createdAt: "2026-01-15",
    createdBy: "1",
    organizations: ["1"],
    progress: 75,
    assignedTo: "3",
    documents: ["loyiha.docx", "smeta_rasmiy.pdf"],
    budget: "2.5 миллиард сўм"
  },
  {
    id: "2",
    title: "Самарқанд шаҳар ҳокимлигида янгилик масалаларини қуриш",
    description: "Самарқанд шаҳаридаги 10 та масалани янгилаш, замонавий материаллар sotib olish, qurilishni nazorat qilish",
    priority: "MUHIM",
    status: "YANGI",
    sector: "IQTISODIYOT_BIZNES",
    deadline: "2026-02-15",
    createdAt: "2026-01-20",
    createdBy: "2",
    organizations: ["2"],
    progress: 0,
    assignedTo: "4",
    documents: ["masala_taklif.docx"],
    budget: "800 миллион сўм"
  },
  {
    id: "3",
    title: "Бухоро шаҳар ҳокимлигида қишлоқ инфраструктури яхшириш",
    description: "Бухоро шаҳаридаги 5 км асосий йўлни асфальтлаш, кўприкларни ўрнатish, йўл белгилари qo'yish",
    priority: "SHOSHILINCH_EMAS",
    status: "IJRODA",
    sector: "KOMMUNAL_SOHA",
    deadline: "2026-03-01",
    createdAt: "2026-01-10",
    createdBy: "3",
    organizations: ["3"],
    progress: 60,
    assignedTo: "5",
    documents: ["infrastructure_plan.pdf", "road_construction.jpg"],
    budget: "3.2 миллиард сўм"
  },
  {
    id: "4",
    title: "Фарғона вилоятида қишлоқ мактабларини таъмирлаш",
    description: "Фарғона вилоятида 20 та мактабнинг қишлоқини ta'mirlash, mebel va jihozlarni yetkazish",
    priority: "MUHIM",
    status: "MUDDATI_KECH",
    sector: "TALIM",
    deadline: "2026-02-01",
    createdAt: "2026-01-05",
    createdBy: "4",
    organizations: ["4"],
    progress: 90,
    assignedTo: "6",
    documents: ["maktab_materials.xlsx", "renovation_plan.docx"],
    budget: "1 миллиард сўм"
  },
  {
    id: "5",
    title: "Наманган вилоятида сув тармоқ тизимини модернизация қилиш",
    description: "Наманган шаҳарда 3 та қишлоқ об'ектини модернизация qilish, nasoslar va nasoslar o'rnatish",
    priority: "ODDIY",
    status: "IJRODA",
    sector: "KOMMUNAL_SOHA",
    deadline: "2026-04-15",
    createdAt: "2026-01-25",
    createdBy: "5",
    organizations: ["5"],
    progress: 30,
    assignedTo: "7",
    documents: ["water_system_design.pdf"],
    budget: "5 миллиард сўм"
  },
  {
    id: "6",
    title: "Андижон вилоятида транспорт инфраструктури ривожатлари",
    description: "Андижон шаҳаридаги транспорт yo'llarini ta'mirlash, ko'priklar va yo'l belgilari qo'yish",
    priority: "SHOSHILINCH_EMAS",
    status: "YANGI",
    sector: "TRANSPORT",
    deadline: "2026-03-15",
    createdAt: "2026-01-18",
    createdBy: "6",
    organizations: ["6"],
    progress: 0,
    assignedTo: "8",
    documents: ["road_repair_plan.docx"],
    budget: "4 миллиард сўм"
  },
  {
    id: "7",
    title: "Ishsizlarni ro'yxatga olish",
    description: "Bandlik markazida ishsiz fuqarolarni qayta ro'yxatga olish va treninglar tashkil etish",
    priority: "SHOSHILINCH_EMAS",
    status: "IJRODA",
    sector: "BANDLIK_MEHNAT",
    deadline: "2026-02-20",
    createdAt: "2026-01-15",
    createdBy: "2",
    organizations: ["6"],
  },
  {
    id: "8",
    title: "Ijtimoiy yordam ko'rsatish",
    description: "Kam ta'minlangan oilalarga ijtimoiy yordam paketlarini yetkazish",
    priority: "MUHIM",
    status: "BAJARILDI",
    sector: "IJTIMOIY_HIMOYA",
    deadline: "2026-01-18",
    createdAt: "2026-01-08",
    createdBy: "1",
    organizations: ["7"],
  },
  {
    id: "9",
    title: "Ekologik tekshiruv o'tkazish",
    description: "Sanoat korxonalarida ekologik monitoring o'tkazish",
    priority: "SHOSHILINCH_EMAS",
    status: "YANGI",
    sector: "EKOLOGIYA",
    deadline: "2026-02-28",
    createdAt: "2026-01-16",
    createdBy: "2",
    organizations: ["8"],
  },
  {
    id: "10",
    title: "Transport yo'nalishlarini optimallashtirish",
    description: "Jamoat transporti marshrutlarini qayta ko'rib chiqish va yangilash",
    priority: "MUHIM",
    status: "IJRODA",
    sector: "TRANSPORT",
    deadline: "2026-02-10",
    createdAt: "2026-01-14",
    createdBy: "1",
    organizations: ["9"],
  },
]

export const mockTaskExecutions: TaskExecution[] = [
  {
    id: "1",
    taskId: "1",
    executedBy: "3",
    actionType: "IJROGA_OLINDI",
    comment: "Topshiriq qabul qilindi, materiallar buyurtma qilindi",
    createdAt: "2026-01-11T09:00:00",
  },
  {
    id: "2",
    taskId: "2",
    executedBy: "5",
    actionType: "HISOBOT_TOPSHIRILDI",
    comment: "Ta'mirlash ishlari yakunlandi",
    attachments: ["hisobot.pdf", "rasimlar.zip"],
    createdAt: "2026-01-24T16:30:00",
  },
  {
    id: "3",
    taskId: "2",
    executedBy: "1",
    actionType: "NAZORATDAN_YECHILDI",
    comment: "Ishlar qoniqarli bajarilgan",
    createdAt: "2026-01-25T10:00:00",
  },
]

export const mockChatMessages: ChatMessage[] = [
  {
    id: "1",
    taskId: "1",
    senderId: "1",
    type: "system",
    content: "Topshiriq yaratildi",
    createdAt: "2026-01-10T09:00:00",
  },
  {
    id: "2",
    taskId: "1",
    senderId: "3",
    type: "text",
    content: "Topshiriq qabul qilindi. Materiallar buyurtma qilindi, 3 kun ichida yetkazib beriladi.",
    createdAt: "2026-01-11T09:15:00",
  },
  {
    id: "3",
    taskId: "1",
    senderId: "1",
    type: "text",
    content: "Yaxshi, ish jarayonini kuzatib boring va har kuni hisobot bering.",
    createdAt: "2026-01-11T10:30:00",
  },
  {
    id: "4",
    taskId: "1",
    senderId: "3",
    type: "file",
    content: "Materiallar yetkazib berildi",
    attachments: ["material-qabul-akti.pdf"],
    createdAt: "2026-01-14T14:00:00",
  },
  {
    id: "5",
    taskId: "1",
    senderId: "4",
    type: "text",
    content: "Ta'mirlash ishlari boshlandi. 200 metr qoplama yotqizildi.",
    createdAt: "2026-01-15T16:45:00",
  },
  {
    id: "6",
    taskId: "2",
    senderId: "1",
    type: "system",
    content: "Topshiriq yaratildi",
    createdAt: "2026-01-05T08:00:00",
  },
  {
    id: "7",
    taskId: "2",
    senderId: "5",
    type: "text",
    content: "Sport zali ta'mirlash ishlari yakunlandi. Oshxona ishlari davom etmoqda.",
    createdAt: "2026-01-20T11:00:00",
  },
  {
    id: "8",
    taskId: "2",
    senderId: "5",
    type: "file",
    content: "Yakuniy hisobot",
    attachments: ["hisobot.pdf", "rasmlar.zip"],
    createdAt: "2026-01-24T16:30:00",
  },
  {
    id: "9",
    taskId: "2",
    senderId: "1",
    type: "system",
    content: "Nazoratdan yechildi: Ishlar qoniqarli bajarilgan",
    createdAt: "2026-01-25T10:00:00",
  },
]

export interface Appeal {
  id: string
  citizenName: string
  citizenPhone: string
  subject: string
  description: string
  category: string
  status: string
  createdAt: string
  organizationId: string
  assignedTo?: string
  priority: string
  deadline: string
  response?: string
}

export const mockAppeals: Appeal[] = [
  {
    id: "1",
    citizenName: "Абдулла Каримов",
    citizenPhone: "+998901234567",
    subject: "Ички йўлларни таъмирлаш",
    description: "Махалламиздаги асосий кўчанинг зарарлангани ҳақида шикоят қиламан. Йўл қаттиқ ёғилгани учун транспорт ҳаракати қийинлашибтирмоқда.",
    category: "YO'L_INFRATUKTURA",
    status: "YANGI",
    createdAt: "2026-01-17T10:30:00Z",
    organizationId: "1",
    assignedTo: "2",
    priority: "MUHIM",
    deadline: "2026-01-24T23:59:59Z",
    response: null,
  },
  {
    id: "2", 
    citizenName: "Дилшод Рахимов",
    citizenPhone: "+998902345678",
    subject: "Макбинг иссиқлиги",
    description: "3-мактабнинг қишки иссиқлиги тизими ишламаяпти. Болалар совукда дарс олаяпти.",
    category: "TA'LIM",
    status: "IJRODA",
    createdAt: "2026-01-16T14:20:00Z",
    organizationId: "2",
    assignedTo: "3",
    priority: "SHOSHILINCH_EMAS",
    deadline: "2026-01-23T23:59:59Z",
    response: "Текшириш учун мутахассис жўнатилди.",
  },
  {
    id: "3",
    citizenName: "Гулнора Тўхтасинова",
    citizenPhone: "+998903456789", 
    subject: "Сув таъминоти",
    description: "Беркум туманида кеча соат 20:00 дан бери сув йўқ. Аҳоли етакилмоқда.",
    category: "KOMMUNAL_XIZMAT",
    status: "BAJARILDI",
    createdAt: "2026-01-15T09:15:00Z",
    organizationId: "3",
    assignedTo: "4",
    priority: "MUHIM_SHOSHILINCH",
    deadline: "2026-01-15T23:59:59Z",
    response: "Сув таъминоти тикланди. Узилик сабаби - насос станциясида техник ариза.",
  }
]

export const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "task_new",
    title: "Тошкент шаҳар ҳокимлиги биноси таъмириш лойиҳаси",
    description: "Тошкент шаҳар ҳокимлиги биносини қайта таъмириш лойиҳаси бошланди. Муддат: 2026-01-25",
    read: false,
    createdAt: "2026-01-20T08:30:00Z",
    taskId: "1",
    userId: "1"
  },
  {
    id: "2",
    type: "task_deadline",
    title: "Самарқанд шаҳар ҳокимлигида янгилик масалаларини қуриш",
    description: "Самарқанд шаҳар ҳокимлигида 10 та янгилик масаланинг муддати яқин қолмоқда. Муддат: 2026-01-22",
    read: false,
    createdAt: "2026-01-22T16:00:00Z",
    taskId: "2",
    userId: "2"
  },
  {
    id: "3",
    type: "task_completed",
    title: "Бухоро шаҳар ҳокимлигида қишлоқ инфраструктури яхшириш якунланди",
    description: "Бухоро шаҳар ҳокимлигида 5 км асосий йўлни асфальтлаш ишлари якунланди. Муддат: 2026-01-18",
    read: true,
    createdAt: "2026-01-18T14:30:00Z",
    taskId: "3",
    userId: "3"
  },
  {
    id: "4",
    type: "user_added",
    title: "Янги фойдаланувчи қўшилди",
    description: "Фарғона вилояти ҳокимлигига янги фойдаланувчи қўшилди. Рол: TASHKILOT_MASUL",
    read: false,
    createdAt: "2026-01-21T09:15:00Z",
    userId: "8"
  },
  {
    id: "5",
    type: "system",
    title: "Тизим янгиланди",
    description: "E-hokimiyat тизими янги функциялар қўшилди: фойдаланувчи бошқарув, ҳисоботлар ва аналитика",
    read: true,
    createdAt: "2026-01-21T08:00:00Z",
    userId: "6"
  },
  {
    id: "6",
    type: "task_overdue",
    title: "Муддат узайтирилди",
    description: "Фарғона вилоятида сув тармоқ тизими модернизацияси лойиҳаси. Муддат: 2026-01-15",
    read: false,
    createdAt: "2026-01-21T10:00:00Z",
    taskId: "4",
    userId: "4"
  }
]

export const mockAuditLogs: AuditLog[] = [
  {
    id: "1",
    userId: "1",
    action: "USER_CREATED",
    details: "Tashkilot rahbari qo'shildi",
    targetType: "user",
    targetId: "5",
    createdAt: "2026-01-16T14:00:00",
  },
  {
    id: "2",
    userId: "1",
    action: "TASK_CREATED",
    details: "Yangi topshiriq yaratildi",
    targetType: "task",
    targetId: "5",
    createdAt: "2026-01-17T08:00:00",
  },
  {
    id: "3",
    userId: "1",
    action: "TASK_CLOSED",
    details: "Topshiriq nazoratdan yechildi",
    targetType: "task",
    targetId: "2",
    createdAt: "2026-01-25T10:00:00",
  },
]

export const mockSystemSettings: SystemSettings = {
  telegramBotToken: "",
  telegramBotUsername: "",
  emailSmtpHost: "smtp.gov.uz",
  emailSmtpPort: 587,
  emailSenderAddress: "noreply@hokimlik.uz",
}

export function getOrganizationById(id: string) {
  return mockOrganizations.find((org) => org.id === id)
}

export function getUserById(id: string) {
  return mockUsers.find((user) => user.id === id)
}

export function maskPnfl(pnfl: string) {
  if (!pnfl) return '****'
  return `***${pnfl.slice(-4)}`
}

export function getChatMessagesByTaskId(taskId: string) {
  return mockChatMessages.filter((msg) => msg.taskId === taskId)
}

export function getUnreadNotificationsCount() {
  return mockNotifications.filter((n) => !n.read).length
}

export function canUserAddRole(currentUserRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy: Record<UserRole, UserRole[]> = {
    ADMIN: ["TUMAN_HOKIMI", "HOKIMLIK_MASUL", "TASHKILOT_RAHBAR", "TASHKILOT_MASUL"],
    TUMAN_HOKIMI: ["HOKIMLIK_MASUL", "TASHKILOT_RAHBAR", "TASHKILOT_MASUL"],
    HOKIMLIK_MASUL: ["TASHKILOT_RAHBAR", "TASHKILOT_MASUL"],
    TASHKILOT_RAHBAR: ["TASHKILOT_MASUL"],
    TASHKILOT_MASUL: [],
  }
  return hierarchy[currentUserRole]?.includes(targetRole) || false
}

export function canUserPerformAction(
  userRole: UserRole,
  action:
    | "create_task"
    | "close_task"
    | "reassign_task"
    | "extend_deadline"
    | "create_org"
    | "add_user"
    | "admin_settings",
): boolean {
  const permissions: Record<string, UserRole[]> = {
    create_task: ["ADMIN", "TUMAN_HOKIMI", "HOKIMLIK_MASUL"],
    close_task: ["ADMIN", "TUMAN_HOKIMI"],
    reassign_task: ["ADMIN", "TUMAN_HOKIMI"],
    extend_deadline: ["ADMIN", "TUMAN_HOKIMI"],
    create_org: ["ADMIN", "TUMAN_HOKIMI", "HOKIMLIK_MASUL"],
    add_user: ["ADMIN", "TUMAN_HOKIMI", "HOKIMLIK_MASUL", "TASHKILOT_RAHBAR"],
    admin_settings: ["ADMIN"],
  }
  return permissions[action]?.includes(userRole) || false
}

export function getTasksBySector(): Record<Sector, number> {
  const result = {} as Record<Sector, number>
  for (const sector of Object.keys(sectorLabels) as Sector[]) {
    result[sector] = mockTasks.filter((t) => t.sector === sector).length
  }
  return result
}

export function getSectorStatistics() {
  const sectors = Object.keys(sectorLabels) as Sector[]
  return sectors
    .map((sector) => {
      const tasks = mockTasks.filter((t) => t.sector === sector)
      const completed = tasks.filter((t) => t.status === "BAJARILDI" || t.status === "NAZORATDAN_YECHILDI").length
      const late = tasks.filter((t) => t.status === "MUDDATI_KECH").length
      return {
        sector,
        label: sectorLabels[sector],
        total: tasks.length,
        completed,
        late,
        inProgress: tasks.length - completed - late,
        completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      }
    })
    .filter((s) => s.total > 0)
}
