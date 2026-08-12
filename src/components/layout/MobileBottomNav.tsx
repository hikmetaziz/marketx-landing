"use client";

import { Heart, Home, LayoutGrid, Plus, UserCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileNavItem = {
  href: string;
  label: string;
  ariaLabel: string;
  icon: LucideIcon;
  key: "home" | "listings" | "create" | "favorites" | "profile";
};

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    href: "/",
    label: "Ana səhifə",
    ariaLabel: "Ana səhifəyə keç",
    icon: Home,
    key: "home",
  },
  {
    href: "/elanlar",
    label: "Elanlar",
    ariaLabel: "Elanlara keç",
    icon: LayoutGrid,
    key: "listings",
  },
  {
    href: "/elan-yarat",
    label: "Elan yarat",
    ariaLabel: "Elan yarat",
    icon: Plus,
    key: "create",
  },
  {
    href: "/account/favorites",
    label: "Seçilmişlər",
    ariaLabel: "Seçilmişlərə keç",
    icon: Heart,
    key: "favorites",
  },
  {
    href: "/account",
    label: "Profil",
    ariaLabel: "Profilə keç",
    icon: UserCircle,
    key: "profile",
  },
];

function isMobileNavActive(pathname: string, item: MobileNavItem): boolean {
  if (item.key === "home") {
    return pathname === "/";
  }

  if (item.key === "listings") {
    return pathname === "/elanlar" || pathname.startsWith("/elanlar/");
  }

  if (item.key === "create") {
    return pathname === "/elan-yarat" || pathname.startsWith("/create-listing");
  }

  if (item.key === "favorites") {
    return pathname === "/account/favorites";
  }

  return pathname === "/account" || (pathname.startsWith("/account/") && pathname !== "/account/favorites");
}

function navItemClass(active: boolean): string {
  return [
    "flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center transition-colors",
    active ? "text-brand-primary" : "text-brand-muted hover:bg-brand-primary-light/30 hover:text-brand-primary-dark",
  ].join(" ");
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobil əsas naviqasiya"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border/80 bg-white/95 px-2 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_rgb(15_23_42/0.08)] backdrop-blur-lg md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isMobileNavActive(pathname, item);
          const Icon = item.icon;

          if (item.key === "create") {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.ariaLabel}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center text-brand-primary"
              >
                <span
                  className={[
                    "grid h-11 w-11 place-items-center rounded-2xl text-white shadow-[0_8px_20px_rgb(37_99_235/0.28)] transition-colors",
                    active ? "bg-brand-primary-dark" : "bg-brand-primary",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-h-[1.35rem] text-center text-[10px] font-black leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-label={item.ariaLabel}
              aria-current={active ? "page" : undefined}
              className={navItemClass(active)}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-h-[1.35rem] text-center text-[10px] font-bold leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
