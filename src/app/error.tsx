"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Xəta</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-text">Nəsə səhv getdi</h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-muted">
        Gözlənilməz xəta baş verdi. Yenidən cəhd edin və ya ana səhifəyə qayıdın.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="btn-primary-premium inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white"
        >
          Yenidən cəhd et
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-brand-border px-6 py-3 text-sm font-semibold text-brand-text hover:border-brand-primary/40 hover:text-brand-primary"
        >
          Ana səhifə
        </Link>
      </div>
    </div>
  );
}
