export const SITE = {
  name: "MarktX",
  domain: "marketx.az",
  url: "https://marketx.az",
  contactEmail: "info@marketx.az",
  location: "Bakı, Azərbaycan",
  legalScope: "MarktX veb-saytı",
  footerTagline: "Online elan platforması.",
  officialSiteNote: "MarktX platformasının rəsmi saytı: marketx.az",
  aiNote: "",
} as const;

export const LEGAL_LINKS = [
  { href: "/terms", label: "İstifadə razılaşması" },
  { href: "/privacy", label: "Gizlilik siyasəti" },
  { href: "/pricing", label: "Qiymətlər" },
] as const;

export const HERO = {
  headlineBefore: "Online elan, ",
  headlineBrand: "MarktX",
  headlineAfter: "-la daha asan.",
  subtitle: "Online elan platforması",
  subtitleNote: "",
  primaryCta: { label: "Kateqoriyalara bax", href: "/categories" },
  secondaryCta: { label: "Necə işləyir?", href: "/how-it-works" },
} as const;

export const MAIN_NAV = [
  { href: "/", label: "Ana Səhifə" },
  { href: "/categories", label: "Kateqoriyalar" },
  { href: "/how-it-works", label: "Necə işləyir?" },
  { href: "/about", label: "Haqqımızda" },
  { href: "/contact", label: "Əlaqə" },
] as const;

export const FOOTER_NAV = MAIN_NAV;

export const ALL_CATEGORIES = [
  "Daşınmaz əmlak",
  "Avtomobil və nəqliyyat",
  "Elektronika",
  "Məişət texnikası",
  "Ev və bağ",
  "Mebel və interyer",
  "Geyim və aksesuar",
  "Xidmətlər",
  "İş elanları",
  "Uşaq məhsulları",
  "Heyvanlar",
  "Biznes və avadanlıq",
  "Təmir və ustalar",
  "Təhsil və kurslar",
  "Digər",
] as const;

export const BUYER_STEPS = [
  "Məhsul və ya xidmət axtar",
  "Elanı yoxla",
  "Satıcı ilə əlaqə qur",
] as const;

export const SELLER_STEPS = [
  "Elan yarat",
  "Məlumat və şəkil əlavə et",
  "Alıcılarla əlaqə saxla",
] as const;

export const ABOUT_TRUST = [
  { title: "Sadə istifadə", description: "Elan yerləşdirmək və axtarış etmək intuitivdir." },
  { title: "Geniş kateqoriyalar", description: "Müxtəlif məhsul və xidmət kateqoriyaları mövcuddur." },
  { title: "Etibarlı yanaşma", description: "Platforma təhlükəsiz və şəffaf istifadə üçün qurulub." },
] as const;

/** Ana səhifədə göstərilən 8 əsas kateqoriya — ALL_CATEGORIES alt dəstidir */
export const HOME_CATEGORIES = [
  { title: "Elektronika", icon: "monitor" },
  { title: "Məişət texnikası", icon: "washing" },
  { title: "Ev və bağ", icon: "house" },
  { title: "Mebel və interyer", icon: "armchair" },
  { title: "Daşınmaz əmlak", icon: "building" },
  { title: "Avtomobil və nəqliyyat", icon: "car" },
  { title: "Xidmətlər", icon: "briefcase" },
  { title: "Digər", icon: "grid" },
] as const satisfies ReadonlyArray<{
  title: (typeof ALL_CATEGORIES)[number];
  icon: string;
}>;

export const TRUST_CARDS = [
  {
    title: "Təhlükəsiz platforma",
    description: "Elanlar moderasiya olunur, təhlükəsiz mühit təmin edilir.",
    icon: "shield",
  },
  {
    title: "Sadə və sürətli",
    description: "Elan yerləşdirmək və tapmaq cəmi bir neçə dəqiqə.",
    icon: "clock",
  },
  {
    title: "Böyüyən icma",
    description: "Platforma genişlənir — tezliklə daha çox elan və istifadəçi.",
    icon: "users",
  },
  {
    title: "Məlumatlarınız qorunur",
    description: "Şəxsi məlumatlarınız bizim üçün önəmlidir.",
    icon: "lock",
  },
] as const;

export const POPULAR_LISTINGS = [
  {
    id: "washing-machine",
    slug: "paltaryuyan-masin",
    title: "Paltaryuyan maşın",
    price: "450 AZN",
    location: "Bakı, Nəsimi",
    time: "Bugün, 11:20",
    image: "/images/listings/washing-machine.jpg",
    fallback: "from-sky-100 to-blue-50",
    status: "sold",
    isSample: true,
    views: 124,
  },
  {
    id: "vacuum",
    slug: "tozsoran",
    title: "Tozsoran",
    price: "120 AZN",
    location: "Bakı, Yasamal",
    time: "Bugün, 09:45",
    image: "/images/listings/vacuum.jpg",
    fallback: "from-slate-100 to-gray-50",
    status: "sold",
    isSample: true,
    views: 89,
  },
  {
    id: "robot-vacuum",
    slug: "robot-tozsoran",
    title: "Robot tozsoran",
    price: "320 AZN",
    location: "Sumqayıt",
    time: "Dünən",
    image: "/images/listings/robot-vacuum.jpg",
    fallback: "from-zinc-100 to-slate-50",
    status: "sold",
    isSample: true,
    views: 156,
  },
  {
    id: "blender",
    slug: "blender",
    title: "Blender",
    price: "80 AZN",
    location: "Gəncə",
    time: "Bugün, 08:10",
    image: "/images/listings/blender.jpg",
    fallback: "from-orange-100 to-amber-50",
    status: "sold",
    isSample: true,
    views: 67,
  },
  {
    id: "microwave",
    slug: "mikrodalgali-soba",
    title: "Mikrodalğalı soba",
    price: "110 AZN",
    location: "Bakı, Nərimanov",
    time: "Bugün, 07:30",
    image: "/images/listings/microwave.jpg",
    fallback: "from-stone-100 to-neutral-50",
    status: "sold",
    isSample: true,
    views: 203,
  },
  {
    id: "coffee-machine",
    slug: "kofe-masini",
    title: "Kofe maşını",
    price: "250 AZN",
    location: "Bakı, Xətai",
    time: "Dünən",
    image: "/images/listings/coffee-machine.jpg",
    fallback: "from-amber-100 to-yellow-50",
    status: "sold",
    isSample: true,
    views: 142,
  },
  {
    id: "chair",
    slug: "rahat-kreslo",
    title: "Rahat kreslo",
    price: "180 AZN",
    location: "Xırdalan",
    time: "Bugün, 10:05",
    image: "/images/listings/chair.jpg",
    fallback: "from-rose-100 to-pink-50",
    status: "sold",
    isSample: true,
    views: 98,
  },
  {
    id: "lamp",
    slug: "gece-lampasi",
    title: "Gecə lampası",
    price: "70 AZN",
    location: "Bakı, Sabunçu",
    time: "Bugün, 06:50",
    image: "/images/listings/lamp.jpg",
    fallback: "from-yellow-100 to-amber-50",
    status: "sold",
    isSample: true,
    views: 54,
  },
] as const;
