/** Brauzer/laptop marketplace preview — veb platforması, mobil tətbiq reklamı deyil. */
export function HeroPreview() {
  const listings = [
    { title: "Paltaryuyan", price: "450 AZN", tone: "from-cyan-100 to-sky-50" },
    { title: "Tozsoran", price: "85 AZN", tone: "from-teal-100 to-emerald-50" },
    { title: "Blender", price: "45 AZN", tone: "from-orange-100 to-amber-50" },
    { title: "Kreslo", price: "280 AZN", tone: "from-rose-100 to-pink-50" },
    { title: "Kofe maşını", price: "195 AZN", tone: "from-amber-100 to-yellow-50" },
    { title: "Lampa", price: "35 AZN", tone: "from-yellow-100 to-amber-50" },
  ];

  return (
    <div className="relative w-full" aria-hidden="true">
      <div className="overflow-hidden rounded-2xl border border-brand-border bg-gradient-to-br from-slate-50 to-white p-4 shadow-xl sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <div className="ml-2 h-6 flex-1 rounded-md bg-white px-3 text-[10px] leading-6 text-brand-muted shadow-inner">
            marketx.az/elanlar
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-md">
          <div className="flex items-center justify-between bg-brand-primary px-4 py-2.5">
            <span className="text-sm font-bold text-white">MarktX — Elanlar</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
              Marketplace
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {listings.map((item) => (
              <div
                key={item.title}
                className="overflow-hidden rounded-lg border border-brand-border"
              >
                <div className={`aspect-[4/3] bg-gradient-to-br ${item.tone}`} />
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-bold text-brand-primary">{item.price}</p>
                  <p className="truncate text-[9px] font-medium text-brand-text">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-2 h-2 w-[85%] rounded-b-xl bg-slate-200" />
    </div>
  );
}
