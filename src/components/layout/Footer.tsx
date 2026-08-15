import { Globe, Mail, MapPin } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { FOOTER_NAV, LEGAL_LINKS, SITE } from "@/constants/data";

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
