import Link from "next/link";

type PageShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
};

export function PageShell({ title, subtitle, children, wide = false }: PageShellProps) {
  return (
    <article
      className={`mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8 ${wide ? "max-w-7xl" : "max-w-3xl"}`}
    >
      <Link
        href="/"
        className="text-sm font-semibold text-brand-primary transition-colors hover:text-brand-primary-dark"
      >
        ← Ana səhifə
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-text sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-brand-muted">{subtitle}</p>
      ) : null}
      <div className="mt-8">{children}</div>
    </article>
  );
}

export function PageSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-brand-text">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-brand-muted sm:text-base">{children}</div>
    </section>
  );
}

export function StepList({ items }: { items: readonly string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li
          key={item}
          className="flex gap-3 rounded-xl border border-brand-border/90 bg-white p-4 shadow-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
            {index + 1}
          </span>
          <span className="pt-1 text-brand-text">{item}</span>
        </li>
      ))}
    </ol>
  );
}
