type ListingDetailMetadataProps = {
  items: Array<{ label: string; value: string }>;
};

export function ListingDetailMetadata({ items }: ListingDetailMetadataProps) {
  return (
    <dl className="divide-y divide-brand-border/60 overflow-hidden rounded-xl border border-brand-border/80 bg-brand-surface/50">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <dt className="shrink-0 text-brand-muted">{label}</dt>
          <dd className="text-right font-semibold text-brand-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
