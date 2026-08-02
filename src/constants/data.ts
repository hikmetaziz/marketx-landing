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

export const HERO = { headlineBefore: "Online elan, ", headlineBrand: "MarktX", headlineAfter: "-la", headlineSecondLine: "daha asan.", subtitle: "Online elan platforması", subtitleNote: "", primaryCta: { label: "Kateqoriyalara bax", href: "/categories" }, secondaryCta: { label: "Necə işləyir?", href: "/how-it-works" } } as const;

export const MAIN_NAV = [
  { href: "/", label: "Ana Səhifə" },
  { href: "/categories", label: "Kateqoriyalar" },
  { href: "/stores", label: "Mağazalar" },
  { href: "/how-it-works", label: "Necə işləyir?" },
  { href: "/about", label: "Haqqımızda" },
  { href: "/contact", label: "Əlaqə" },
] as const;

export const FOOTER_NAV = MAIN_NAV;

export const ALL_CATEGORIES = [
  "Daşınmaz əmlak",
  "Avtomobil və nəqliyyat",
  "Avto ehtiyat hissələri və avadanlıq",
  "Telefon",
  "Elektronika",
  "Məişət texnikası",
  "Ev və bağ",
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
  { title: "Telefon", icon: "phone" },
  { title: "Elektronika", icon: "monitor" },
  { title: "Məişət texnikası", icon: "washing" },
  { title: "Ev və bağ", icon: "house" },
  { title: "Daşınmaz əmlak", icon: "building" },
  { title: "Avtomobil və nəqliyyat", icon: "car" },
  { title: "Avto ehtiyat hissələri və avadanlıq", icon: "hammer" },
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
