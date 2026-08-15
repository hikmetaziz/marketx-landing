export function ListingPaymentWarning() {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5"
      role="note"
    >
      <span className="text-base leading-5" aria-hidden>
        ⚠️
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-brand-text">Beh göndərməzdən əvvəl diqqətli olun.</p>
        <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">
          Qarşı tərəfi və məhsulu yoxlamadan ödəniş etməyin.
        </p>
      </div>
    </div>
  );
}
