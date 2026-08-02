import Link from "next/link";

type StoreAccessTabsProps = {
  active: "claim" | "apply";
};

export function StoreAccessTabs({ active }: StoreAccessTabsProps) {
  return (
    <nav
      aria-label="Mağaza giriş seçimləri"
      className="mx-auto mb-6 grid w-full max-w-3xl grid-cols-2 gap-1 rounded-xl border border-brand-border bg-brand-surface/60 p-1"
    >
      <Link
        href="/account/store/claim"
        aria-current={active === "claim" ? "page" : undefined}
        className={
          active === "claim"
            ? "rounded-lg bg-brand-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-sm"
            : "rounded-lg px-4 py-3 text-center text-sm font-semibold text-brand-muted transition-colors hover:bg-white hover:text-brand-text"
        }
      >
        Mağaza kodum var
      </Link>

      <Link
        href="/account/store/apply"
        aria-current={active === "apply" ? "page" : undefined}
        className={
          active === "apply"
            ? "rounded-lg bg-brand-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-sm"
            : "rounded-lg px-4 py-3 text-center text-sm font-semibold text-brand-muted transition-colors hover:bg-white hover:text-brand-text"
        }
      >
        Yeni mağaza açmaq istəyirəm
      </Link>
    </nav>
  );
}
