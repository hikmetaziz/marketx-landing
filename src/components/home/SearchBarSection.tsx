import { Search } from "lucide-react";

const glassField =
  "search-glass-field h-14 w-full rounded-xl px-4 text-[15px] placeholder-white/35 opacity-80";

export function SearchBarSection() {
  return (
    <section className="relative z-10 pb-12 sm:pb-14" aria-labelledby="search-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Badge + label */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-md bg-amber-400/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
            Tezliklə
          </span>
          <p id="search-heading" className="text-sm text-white/65">
            Elan axtarışı hazırlanır — hazırda aktiv deyil
          </p>
        </div>

        {/* Glassmorphism card */}
        <fieldset
          disabled
          className="search-glass rounded-2xl p-3.5 sm:rounded-3xl sm:p-4"
        >
          <legend className="sr-only">Elan axtarışı (tezliklə)</legend>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[2.2fr_1.15fr_1.05fr_0.95fr_auto] lg:items-stretch">
            <label className="relative block">
              <span className="sr-only">Məhsul, kateqoriya və ya açar söz</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
              <input
                type="text"
                placeholder="Məhsul, kateqoriya və ya açar söz"
                className={`${glassField} pl-11`}
                readOnly
                tabIndex={-1}
              />
            </label>

            <select aria-label="Kateqoriya" className={glassField} tabIndex={-1}>
              <option>Bütün kateqoriyalar</option>
            </select>

            <select aria-label="Şəhər" className={glassField} tabIndex={-1}>
              <option>Bütün şəhərlər</option>
            </select>

            <input
              type="text"
              placeholder="Qiymət (AZN)"
              aria-label="Qiymət"
              className={glassField}
              readOnly
              tabIndex={-1}
            />

            <div
              aria-hidden="true"
              className="inline-flex h-14 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 text-[15px] font-bold text-white/50 opacity-70 lg:min-w-[120px]"
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
