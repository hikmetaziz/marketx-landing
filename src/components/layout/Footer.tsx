import { Globe, Mail, MapPin } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { FacebookIcon, InstagramIcon } from "@/components/ui/SocialIcons";
import { FOOTER_NAV, LEGAL_LINKS, SITE } from "@/constants/data";

function AppStoreMark() {
  return (
    <svg className="h-6 w-5 shrink-0" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-72.4-19.7C63.3 141.2 0 187.8 0 282.3c0 27.9 5.1 56.8 15.3 86.2 13.6 36.7 62.6 126.7 113.7 125.2 26.7-.6 45.6-18.9 80.2-18.9 33.6 0 51.1 18.9 80.8 18.9 51.5-.7 96-82 109-119.3-69-32.5-65.3-95.2-65.3-97.5zM260.4 104.5c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GooglePlayMark() {
  return (
    <svg className="h-6 w-5 shrink-0" viewBox="0 0 32 36" aria-hidden="true">
      <path fill="#dbe3ee" d="M3 2.3 18.4 18 3 33.7c-.7-.7-1-1.7-1-2.8V5.1c0-1.1.3-2.1 1-2.8Z" />
      <path fill="#fff" d="m4.3 1.4 18.1 10.4-4 6.2L3 2.3c.4-.4.8-.7 1.3-.9Z" />
      <path fill="#fff" d="m18.4 18 4 6.2L4.3 34.6c-.5-.2-.9-.5-1.3-.9L18.4 18Z" />
      <path fill="#cbd5e1" d="m22.4 11.8 6.1 3.5c2 1.2 2 4.2 0 5.4l-6.1 3.5-4-6.2 4-6.2Z" />
    </svg>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 bg-brand-navy text-slate-300 sm:mt-20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo className="text-[1.2rem]" variant="light" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">{SITE.footerTagline}</p>

            <div className="mt-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Bizi izləyin</h2>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 text-slate-300"
                  aria-label="Instagram — tezliklə"
                  aria-disabled="true"
                  title="Tezliklə"
                >
                  <InstagramIcon className="h-5 w-5" />
                </span>
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 text-slate-300"
                  aria-label="Facebook — tezliklə"
                  aria-disabled="true"
                  title="Tezliklə"
                >
                  <FacebookIcon className="h-5 w-5" />
                </span>
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tətbiqi yüklə</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex h-12 min-w-[120px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/20 px-3 text-white"
                  aria-label="App Store — tezliklə"
                  aria-disabled="true"
                  title="Tezliklə"
                >
                  <AppStoreMark />
                  <span className="min-w-0 text-left leading-none">
                    <span className="block text-[9px] font-medium text-slate-400">Yüklə</span>
                    <span className="mt-1 block whitespace-nowrap text-[14px] font-bold">App Store</span>
                  </span>
                </span>
                <span
                  className="inline-flex h-12 min-w-[128px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/20 px-3 text-white"
                  aria-label="Google Play — tezliklə"
                  aria-disabled="true"
                  title="Tezliklə"
                >
                  <GooglePlayMark />
                  <span className="min-w-0 text-left leading-none">
                    <span className="block text-[9px] font-medium text-slate-400">Yüklə</span>
                    <span className="mt-1 block whitespace-nowrap text-[14px] font-bold">Google Play</span>
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">Linklər</h2>
            <nav className="mt-3 flex flex-col gap-2.5">
              {FOOTER_NAV.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-400 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">Qanuni</h2>
            <nav className="mt-3 flex flex-col gap-2.5">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-400 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">Əlaqə</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
              <li>
                <a
                  href={`mailto:${SITE.contactEmail}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-brand-primary-light" />
                  {SITE.contactEmail}
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-brand-primary-light" />
                {SITE.location}
              </li>
              <li>
                <a
                  href={SITE.url}
                  className="inline-flex items-center gap-2 font-semibold text-brand-primary-light transition-colors hover:text-white"
                >
                  <Globe className="h-4 w-4" />
                  {SITE.domain}
                </a>
              </li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">{SITE.officialSiteNote}</p>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © <span suppressHydrationWarning>{year}</span> {SITE.name}. Bütün hüquqlar qorunur.
        </div>
      </div>
    </footer>
  );
}
