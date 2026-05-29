import Link from "next/link";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function LegalPage({ title, children }: Props) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
      >
        ← Ana səhifə
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-text sm:text-4xl">
        {title}
      </h1>
      <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-brand-muted">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-brand-text">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
