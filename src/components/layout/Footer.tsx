import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { FOOTER_NAV, LEGAL_LINKS, SITE } from "@/constants/data";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-brand-border bg-brand-navy text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLogo className="text-lg" variant="light" />
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{SITE.footerTagline}</p>
            <p className="mt-3 text-xs text-slate-500">{SITE.officialSiteNote}</p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">Linklər</h2>
            <nav className="mt-3 flex flex-col gap-2">
              {FOOTER_NAV.slice(0, 4).map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-slate-400 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">Qanuni</h2>
            <nav className="mt-3 flex flex-col gap-2">
              {LEGAL_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm text-slate-400 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white">Əlaqə</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>
                <a href={`mailto:${SITE.contactEmail}`} className="hover:text-white">
                  {SITE.contactEmail}
                </a>
              </li>
              <li>{SITE.location}</li>
              <li>
                <a href={SITE.url} className="font-semibold text-brand-primary-light hover:text-white">
                  {SITE.domain}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-700 pt-6 text-center text-xs text-slate-500">
          © {year} {SITE.name}. Bütün hüquqlar qorunur.
        </div>
      </div>
    </footer>
  );
}
