export const SITE = {
  name: "MarktX",
  domain: "marketx.az",
  url: "https://marketx.az",
  contactEmail: "info@marketx.az",
  location: "Bakı, Azərbaycan",
  legalScope: "MarktX veb-saytı və mobil tətbiqi",
  footerTagline: "Azərbaycanda alıcı və satıcıları bir araya gətirən platforma.",
  officialSiteNote: "MarktX platformasının rəsmi saytı: marketx.az",
} as const;

export const LEGAL_LINKS = [
  { href: "/privacy", label: "Gizlilik siyasəti" },
  { href: "/terms", label: "İstifadə razılaşması" },
] as const;

export const HERO = {
  headlineBefore: "Sövdələş qazan, ",
  headlineBrand: "MarktX",
  headlineAfter: "-la daha asan.",
  subtitle:
    "MarktX — Azərbaycanda alıcı və satıcıları bir araya gətirən sadə və etibarlı alış-satış platformasıdır.",
  primaryCta: { label: "Elan yerləşdir", href: "/login" },
  secondaryCta: { label: "Kateqoriyalara bax", href: "/categories" },
} as const;

export const MAIN_NAV = [
  { href: "/", label: "Ana Səhifə" },
  { href: "/categories", label: "Kateqoriyalar" },
  { href: "/how-it-works", label: "Necə işləyir?" },
  { href: "/about", label: "Haqqımızda" },
  { href: "/contact", label: "Əlaqə" },
] as const;

export const FOOTER_NAV = MAIN_NAV;
