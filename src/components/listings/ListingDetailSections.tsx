import type { PublicListingStatus } from "@/types/live-listing";

type ListingDetailStatsProps = {
  views: number;
  favorites: number;
};

type FactRow = {
  label: string;
  value: string;
};

const STRUCTURED_DESCRIPTION_LABELS = new Set(
  [
    "Şəhər",
    "Rayon",
    "Marka",
    "Model",
    "Buraxılış ili",
    "Ban növü",
    "Rəng",
    "Mühərrik",
    "Yanacaq",
    "Yürüş",
    "Sürətlər qutusu",
    "Ötürücü",
    "Yeni",
    "Yerlərin sayı",
    "Vəziyyəti",
    "Kredit",
    "Barter",
  ].map(normalizeDescriptionLabel),
);

function normalizeDescriptionLabel(value: string): string {
  return value.trim().replace(/:$/, "").replace(/\s+/g, " ").toLocaleLowerCase("az-AZ");
}

function splitStructuredDescription(description: string | null): {
  rows: FactRow[];
  text: string;
} {
  const lines = (description ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: FactRow[] = [];
  const rest: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const label = lines[index];

    if (normalizeDescriptionLabel(label) === normalizeDescriptionLabel("Təsvir")) {
      continue;
    }

    const value = lines[index + 1];
    const isKnownLabel = STRUCTURED_DESCRIPTION_LABELS.has(normalizeDescriptionLabel(label));
    const nextIsKnownLabel = value ? STRUCTURED_DESCRIPTION_LABELS.has(normalizeDescriptionLabel(value)) : false;

    if (isKnownLabel && value && !nextIsKnownLabel) {
      rows.push({ label: label.replace(/:$/, ""), value });
      index += 1;
      continue;
    }

    rest.push(label);
  }

  return { rows, text: rest.join("\n\n") };
}

function ListingDetailTwoColumnRows({ rows }: { rows: FactRow[] }) {
  return (
    <dl className="grid overflow-hidden rounded-xl border border-brand-border/80 bg-brand-surface/50 md:grid-cols-2">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="min-w-0 border-b border-brand-border/60 px-3 py-2.5 last:border-b-0 md:px-4 md:py-3 md:[&:nth-last-child(-n+2)]:border-b-0 md:odd:border-r md:odd:border-brand-border/60"
        >
          <dt className="text-xs font-semibold text-brand-muted">{label}</dt>
          <dd className="mt-1 break-words text-sm font-extrabold leading-snug text-brand-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ListingDetailStats({ views, favorites }: ListingDetailStatsProps) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-brand-border/80 bg-brand-surface/50">
      <div className="border-r border-brand-border/60 px-4 py-3.5 text-center">
        <p className="text-xs font-semibold text-brand-muted">Baxış</p>
        <p className="mt-1 text-xl font-extrabold text-brand-text">{views}</p>
      </div>
      <div className="px-4 py-3.5 text-center">
        <p className="text-xs font-semibold text-brand-muted">Favorit</p>
        <p className="mt-1 text-xl font-extrabold text-brand-text">{favorites}</p>
      </div>
    </div>
  );
}

export function ListingDetailNumber({ label }: { label: string }) {
  return <p className="text-sm font-bold text-brand-muted">{label}</p>;
}

export function ListingDetailExpiry({
  createdAt,
  expiresAt,
  status,
}: {
  createdAt: string;
  expiresAt: string | null;
  status: PublicListingStatus;
}) {
  if (status !== "active") {
    return null;
  }

  const expiryDate = expiresAt
    ? new Date(expiresAt)
    : (() => {
        const date = new Date(createdAt);
        date.setDate(date.getDate() + 30);
        return date;
      })();

  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000);
  const label =
    daysLeft <= 0
      ? "Elanın 30 günlük müddəti bitib — yeniləyin və ya yenidən yerləşdirin"
      : `${daysLeft} gün sonra deaktiv olacaq`;

  return (
    <p
      className={
        daysLeft <= 7
          ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-sm font-semibold text-amber-900"
          : "text-center text-sm font-semibold text-brand-muted"
      }
    >
      {label}
    </p>
  );
}

export function ListingDetailFacts({ rows }: { rows: FactRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <dl className="divide-y divide-brand-border/60 overflow-hidden rounded-xl border border-brand-border/80 bg-brand-surface/50">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col items-start gap-1 px-3 py-2.5 text-sm min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between min-[390px]:gap-3 md:px-4 md:py-3"
        >
          <dt className="shrink-0 text-brand-muted">{label}</dt>
          <dd className="min-w-0 break-words text-left font-semibold text-brand-text min-[390px]:text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ListingDetailAttributes({ rows }: { rows: FactRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-base font-extrabold text-brand-text">Parametrlər</h2>
      <ListingDetailTwoColumnRows rows={rows} />
    </section>
  );
}

export function ListingDetailDescription({ description }: { description: string | null }) {
  const { rows, text } = splitStructuredDescription(description);
  const fallback = "Bu elan üçün əlavə təsvir daxil edilməyib.";

  return (
    <section className="space-y-2">
      <h2 className="text-base font-extrabold text-brand-text">Təsvir</h2>
      {rows.length > 0 ? <ListingDetailTwoColumnRows rows={rows} /> : null}
      {text || rows.length === 0 ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-text">{text || fallback}</p>
      ) : null}
    </section>
  );
}

export function ListingDetailSeller({ sellerLabel }: { sellerLabel: string }) {
  return (
    <section className="flex items-center gap-3 rounded-xl border border-brand-border/80 bg-brand-surface/50 p-3.5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary-light text-lg font-extrabold text-brand-primary-dark">
        {sellerLabel.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-base font-extrabold text-brand-text">{sellerLabel}</p>
        <p className="text-sm font-semibold text-brand-muted">Satıcı</p>
      </div>
    </section>
  );
}
