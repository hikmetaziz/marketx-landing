type StoreMapEmbedProps = {
  name: string;
  address?: string | null;
  city?: string | null;
  mapUrl?: string | null;
};

function buildQuery(props: StoreMapEmbedProps): string {
  return [props.name, props.address, props.city].filter(Boolean).join(", ");
}

function resolveEmbedSrc(props: StoreMapEmbedProps): string | null {
  const mapUrl = props.mapUrl?.trim();
  // Yalnız embed formatlı linklər iframe-ə qoyulur; adi Google Maps linki iframe-də açılmır
  if (mapUrl && (mapUrl.includes("/embed") || mapUrl.includes("output=embed"))) {
    return mapUrl;
  }

  const query = buildQuery(props);
  if (props.address || props.city) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  }

  return null;
}

function resolveExternalUrl(props: StoreMapEmbedProps): string | null {
  const mapUrl = props.mapUrl?.trim();
  if (mapUrl) return mapUrl;

  const query = buildQuery(props);
  if (props.address || props.city) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return null;
}

export function StoreMapEmbed(props: StoreMapEmbedProps) {
  const embedSrc = resolveEmbedSrc(props);
  const externalUrl = resolveExternalUrl(props);

  if (!embedSrc && !externalUrl) {
    return null;
  }

  const addressLine = [props.address, props.city].filter(Boolean).join(", ");

  return (
    <section className="space-y-3" aria-labelledby="store-map-heading">
      <h2 id="store-map-heading" className="text-lg font-bold text-brand-text">
        Xəritə
      </h2>

      {addressLine ? <p className="text-sm text-brand-muted">{addressLine}</p> : null}

      {embedSrc ? (
        <div className="overflow-hidden rounded-2xl border border-brand-border/90 bg-brand-surface/40">
          <iframe
            title={`${props.name} — xəritə`}
            src={embedSrc}
            className="h-64 w-full border-0 sm:h-80"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : null}

      {externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center justify-center rounded-xl border border-brand-primary/30 bg-brand-primary-light px-4 py-2.5 text-sm font-semibold text-brand-primary-dark transition-colors hover:border-brand-primary/50"
        >
          Xəritədə aç
        </a>
      ) : null}
    </section>
  );
}
