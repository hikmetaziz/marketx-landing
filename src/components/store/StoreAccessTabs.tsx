import Link from "next/link";

type StoreAccessTabsProps = {
  active: "claim" | "apply";
};

export function StoreAccessTabs({ active }: StoreAccessTabsProps) {
  return (
    <nav
      aria-label="Mağaza giriş seçimləri"
      className="mx-auto mb-5 grid w-full max-w-3xl grid-cols-2 gap-1 rounded-xl border border-brand-border bg-brand-surface/60 p-1 md:mb-6"
    >
      <Link
        href="/account/store/claim"
        aria-current={active === "claim" ? "page" : undefined}
        className={
          active === "claim"
            ? "rounded-lg bg-brand-primary px-2.5 py-2.5 text-center text-xs font-semibold text-white shadow-sm md:px-4 md:py-3 md:text-sm"
            : "rounded-lg px-2.5 py-2.5 text-center text-xs font-semibold text-brand-muted transition-colors hover:bg-white hover:text-brand-text md:px-4 md:py-3 md:text-sm"
        }
      >
        Mağaza kodum var
      </Link>

      <Link
        href="/account/store/apply"
        aria-current={active === "apply" ? "page" : undefined}
        className={
          active === "apply"
            ? "rounded-lg bg-brand-primary px-2.5 py-2.5 text-center text-xs font-semibold text-white shadow-sm md:px-4 md:py-3 md:text-sm"
            : "rounded-lg px-2.5 py-2.5 text-center text-xs font-semibold text-brand-muted transition-colors hover:bg-white hover:text-brand-text md:px-4 md:py-3 md:text-sm"
        }
      >
        Yeni mağaza açmaq istəyirəm
      </Link>
    </nav>
  );
}
