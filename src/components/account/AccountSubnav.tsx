import Link from "next/link";

type AccountSubnavProps = {
  active: "listings" | "messages";
};

export function AccountSubnav({ active }: AccountSubnavProps) {
  const linkClass = (key: AccountSubnavProps["active"]) =>
    `rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
      active === key
        ? "border-brand-primary/30 bg-brand-primary-light/40 text-brand-primary"
        : "border-brand-border bg-white text-brand-text hover:border-brand-primary/30 hover:text-brand-primary"
    }`;

  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Kabinet naviqasiyası">
      <Link href="/account/listings" className={linkClass("listings")}>
        Elanlarım
      </Link>
      <Link href="/account/messages" className={linkClass("messages")}>
        Mesajlarım
      </Link>
    </nav>
  );
}
