import { KeyRound, Store } from "lucide-react";
import Link from "next/link";

type ClaimState = "available" | "pending" | "active";

const CLAIM_COPY: Record<ClaimState, { title: string; description: string; href?: string }> = {
  available: {
    title: "Mağaza kodum var",
    description: "Hazır mağaza üçün kod və sahiblik təsdiq kodunu daxil edin.",
    href: "#claim-form",
  },
  pending: {
    title: "Giriş müraciətim yoxlanılır",
    description: "Mövcud claim müraciətiniz nəticələnənədək yenisini göndərməyin.",
  },
  active: {
    title: "Mövcud mağazam",
    description: "Aktiv mağazanızı mövcud mağaza panelindən idarə edin.",
    href: "/account/store",
  },
};

export function StoreOnboardingChoices({ claimState = "available" }: { claimState?: ClaimState }) {
  const claim = CLAIM_COPY[claimState];
  const claimContent = (
    <>
      <KeyRound className="h-6 w-6 shrink-0 text-brand-primary" />
      <span>
        <span className="block text-sm font-bold text-brand-text">{claim.title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-brand-muted">{claim.description}</span>
      </span>
    </>
  );

  return (
    <div className="mx-auto mb-5 grid max-w-3xl gap-3 md:mb-6 md:grid-cols-2">
      {claim.href ? (
        <Link
          href={claim.href}
          className="flex min-h-20 items-center gap-3 rounded-xl border border-brand-primary/35 bg-brand-primary-light/40 p-3.5 transition-colors hover:border-brand-primary md:min-h-24 md:p-4"
        >
          {claimContent}
        </Link>
      ) : (
        <div className="flex min-h-20 items-center gap-3 rounded-xl border border-brand-border bg-brand-surface/50 p-3.5 md:min-h-24 md:p-4">
          {claimContent}
        </div>
      )}
      <Link
        href="/account/store/apply"
        className="flex min-h-20 items-center gap-3 rounded-xl border border-brand-border bg-white p-3.5 transition-colors hover:border-brand-primary/50 md:min-h-24 md:p-4"
      >
        <Store className="h-6 w-6 shrink-0 text-brand-primary" />
        <span>
          <span className="block text-sm font-bold text-brand-text">Yeni mağaza açmaq istəyirəm</span>
          <span className="mt-1 block text-xs leading-relaxed text-brand-muted">
            Məlumatları göndərin; MarktX komandası müraciəti yoxlasın.
          </span>
        </span>
      </Link>
    </div>
  );
}
