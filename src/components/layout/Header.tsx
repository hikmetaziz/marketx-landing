"use client";

import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { HeaderAuthActions } from "@/components/auth/HeaderAuthActions";
import { MAIN_NAV } from "@/constants/data";

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean): string {
  return active
    ? "whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold text-brand-primary bg-brand-primary-light/60 xl:px-3.5 xl:text-[15px]"
    : "whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-brand-muted transition-colors hover:text-brand-text xl:px-3.5 xl:text-[15px]";
}

function mobileNavLinkClass(active: boolean): string {
  return active
    ? "block rounded-lg bg-brand-primary-light/60 px-3 py-2.5 text-sm font-semibold text-brand-primary"
    : "block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-muted hover:bg-brand-surface";
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border/60 bg-white/90 shadow-[0_1px_0_rgb(255_255_255/0.8)_inset,0_1px_12px_rgb(15_23_42/0.04)] backdrop-blur-lg">
      <div className="mx-auto grid h-[72px] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:gap-4 lg:px-8">
        <nav className="hidden min-w-0 lg:block" aria-label="Əsas naviqasiya">
          <ul className="flex items-center gap-0.5">
            {MAIN_NAV.map((link) => {
              const active = isNavActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link href={link.href} className={navLinkClass(active)} aria-current={active ? "page" : undefined}>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-2.5">
          <div className="hidden items-center gap-2.5 lg:flex">
            <HeaderAuthActions />
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menunu aç</span>
            <LayoutGrid className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-brand-border bg-white lg:hidden">
          <nav className="mx-auto max-w-7xl space-y-0.5 px-4 py-3 sm:px-6">
            {MAIN_NAV.map((link) => {
              const active = isNavActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={mobileNavLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-3 flex flex-col gap-2 border-t border-brand-border pt-3">
              <HeaderAuthActions mobile onNavigate={() => setOpen(false)} />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
