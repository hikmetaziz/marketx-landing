import { Search } from "lucide-react";

const fieldClass =
  "h-14 w-full rounded-xl border border-brand-border/60 bg-brand-surface/50 px-4 text-[15px] text-brand-muted/70 shadow-none outline-none cursor-not-allowed opacity-60";

export function SearchBarSection() {
  return (
    <section className="relative z-10 pb-6 sm:pb-7" aria-labelledby="search-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
            Tezliklə
          </span>
          <p id="search-heading" className="text-sm text-brand-muted">
            Elan axtarışı hazırlanır — hazırda aktiv deyil
          </p>
        </div>

        <fieldset
          disabled
          className="search-premium rounded-2xl border-brand-border/70 bg-brand-surface/40 p-3.5 sm:rounded-3xl sm:p-4"
        >
          <legend className="sr-only">Elan axtarışı (tezliklə)</legend>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[2.2fr_1.15fr_1.05fr_0.95fr_auto] lg:items-stretch">
            <label className="relative block">
              <span className="sr-only">Məhsul, kateqoriya və ya açar söz</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-brand-muted/50" />
              <input
                type="text"
                placeholder="Məhsul, kateqoriya və ya açar söz"
                className={`${fieldClass} pl-11`}
                readOnly
                tabIndex={-1}
              />
            </label>

            <select aria-label="Kateqoriya" className={fieldClass} tabIndex={-1}>
              <option>Bütün kateqoriyalar</option>
            </select>

            <select aria-label="Şəhər" className={fieldClass} tabIndex={-1}>
              <option>Bütün şəhərlər</option>
            </select>

            <input
              type="text"
              placeholder="Qiymət (AZN)"
              aria-label="Qiymət"
              className={fieldClass}
              readOnly
              tabIndex={-1}
            />

            <div
              aria-hidden="true"
              className="inline-flex h-14 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/50 px-8 text-[15px] font-bold text-brand-muted/70 opacity-60 lg:min-w-[132px]"
            >
              <Search className="h-[18px] w-[18px]" />
              Tezliklə
            </div>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
