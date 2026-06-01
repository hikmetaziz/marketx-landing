import { Clock3 } from "lucide-react";
import Link from "next/link";

type ComingSoonPanelProps = {
  title?: string;
  description: string;
};

export function ComingSoonPanel({
  title = "Tezliklə aktiv olacaq",
  description,
}: ComingSoonPanelProps) {
  return (
    <div className="card-premium mx-auto max-w-md rounded-2xl p-6 text-center hover:translate-y-0">
      <span className="icon-well mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-primary/20 text-brand-primary">
        <Clock3 className="h-7 w-7" strokeWidth={2} />
      </span>
      <h2 className="mt-5 text-lg font-bold text-brand-text">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-brand-muted">{description}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl border border-brand-border bg-white px-5 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
      >
        Ana səhifəyə qayıt
      </Link>
    </div>
  );
}
