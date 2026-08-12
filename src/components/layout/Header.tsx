"use client";

import { LayoutGrid, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { HeaderAuthActions } from "@/components/auth/HeaderAuthActions";
import { MAIN_NAV } from "@/constants/data";

const HOME_NAV = [
  { href: "/", label: "Ana səhifə" },
  { href: "/categories", label: "Kateqoriyalar" },
  { href: "/stores", label: "Mağazalar" },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean, homepage: boolean): string {
  if (homepage) {
    return active
      ? "whitespace-nowrap rounded-lg bg-brand-primary-light/60 px-2.5 py-2 text-sm font-semibold text-brand-primary xl:px-3.5 xl:text-[15px]"
      : "whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-primary-light/30 hover:text-brand-primary-dark xl:px-3.5 xl:text-[15px]";
  }

  return active
    ? "whitespace-nowrap rounded-lg bg-brand-primary-light/60 px-2.5 py-2 text-sm font-semibold text-brand-primary xl:px-3.5 xl:text-[15px]"
    : "whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-brand-muted transition-colors hover:text-brand-text xl:px-3.5 xl:text-[15px]";
}

function mobileNavLinkClass(active: boolean, homepage: boolean): string {
  if (homepage) {
    return active
      ? "block rounded-lg bg-brand-primary-light/60 px-3 py-2.5 text-sm font-semibold text-brand-primary"
      : "block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-muted hover:bg-brand-primary-light/30 hover:text-brand-primary-dark";
  }

  return active
    ? "block rounded-lg bg-brand-primary-light/60 px-3 py-2.5 text-sm font-semibold text-brand-primary"
    : "block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-muted hover:bg-brand-surface";
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHomepage = pathname === "/";
  const navLinks = isHomepage ? HOME_NAV : MAIN_NAV;

  return (
    <>
      <header className="marktx-mobile-header sticky top-0 z-50 border-b border-brand-border/70 bg-white/95 shadow-[0_2px_14px_rgb(15_23_42/0.04)] backdrop-blur-lg md:hidden">
        <div className="mx-auto grid h-14 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 px-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-text"
            aria-expanded={open}
            aria-controls="mobile-shell-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">Menunu aç</span>
            <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex min-w-0 justify-center">
            <BrandLogo className="text-[22px] leading-none" />
          </div>

          <Link
            href="/account"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-text"
            aria-label="Profil"
          >
            <UserCircle className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>

        {open ? (
          <div id="mobile-shell-nav" className="border-t border-brand-border bg-white">
            <nav className="mx-auto max-w-7xl space-y-0.5 px-4 py-3" aria-label="Mobil naviqasiya">
              {navLinks.map((link) => {
                const active = isNavActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={mobileNavLinkClass(active, isHomepage)}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="mt-3 flex flex-col gap-2 border-t border-brand-border pt-3">
                <HeaderAuthActions homepage={isHomepage} mobile onNavigate={() => setOpen(false)} />
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <header
        className={
          isHomepage
            ? "sticky top-0 z-50 hidden border-b border-brand-border/70 bg-white/95 shadow-[0_2px_14px_rgb(15_23_42/0.04)] backdrop-blur-lg md:block"
            : "sticky top-0 z-50 hidden border-b border-brand-border/60 bg-white/90 shadow-[0_1px_0_rgb(255_255_255/0.8)_inset,0_1px_12px_rgb(15_23_42/0.04)] backdrop-blur-lg md:block"
        }
      >
        <div
          className={
            isHomepage
              ? "mx-auto grid h-[72px] max-w-[1180px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 px-4 sm:px-6 lg:px-0"
              : "mx-auto grid h-[72px] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:gap-4 lg:px-8"
          }
        >
          {isHomepage ? <BrandLogo className="text-2xl" /> : null}

          <nav
            className={isHomepage ? "hidden min-w-0 justify-self-center lg:block" : "hidden min-w-0 lg:block"}
            aria-label="Əsas naviqasiya"
          >
            <ul className="flex items-center gap-0.5">
              {navLinks.map((link) => {
                const active = isNavActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={navLinkClass(active, isHomepage)}
                      aria-current={active ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-2.5">
            <div className="hidden items-center gap-2.5 lg:flex">
              <HeaderAuthActions homepage={isHomepage} />
            </div>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border lg:hidden"
              aria-expanded={open}
              aria-controls="tablet-nav"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="sr-only">Menunu aç</span>
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>

        {open ? (
          <div id="tablet-nav" className="border-t border-brand-border bg-white lg:hidden">
            <nav className="mx-auto max-w-7xl space-y-0.5 px-4 py-3 sm:px-6">
              {navLinks.map((link) => {
                const active = isNavActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={mobileNavLinkClass(active, isHomepage)}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="mt-3 flex flex-col gap-2 border-t border-brand-border pt-3">
                <HeaderAuthActions homepage={isHomepage} mobile onNavigate={() => setOpen(false)} />
              </div>
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}
