"use client";

import { LayoutGrid, Plus, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { MAIN_NAV } from "@/constants/data";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-white shadow-sm">
      <div className="mx-auto grid h-[72px] max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="justify-self-start">
          <BrandLogo className="text-xl sm:text-2xl" />
        </div>

        <nav className="hidden justify-self-center lg:block" aria-label="Əsas naviqasiya">
          <ul className="flex items-center gap-0.5">
            {MAIN_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-text"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center justify-self-end gap-3 lg:flex">
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <User className="h-4 w-4" strokeWidth={2} />
            Daxil ol
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-dark"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Elan yerləşdir
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-lg border border-brand-border lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menunu aç</span>
          <LayoutGrid className="h-5 w-5" />
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-brand-border bg-white lg:hidden">
          <nav className="mx-auto max-w-6xl space-y-1 px-4 py-4">
            {MAIN_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-brand-surface"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-brand-border pt-4">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-sm font-semibold"
                onClick={() => setOpen(false)}
              >
                <User className="h-4 w-4" /> Daxil ol
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                <Plus className="h-4 w-4" /> Elan yerləşdir
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
