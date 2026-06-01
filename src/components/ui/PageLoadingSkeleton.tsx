type PageLoadingSkeletonProps = {
  variant?: "grid" | "detail" | "list";
};

export function PageLoadingSkeleton({ variant = "grid" }: PageLoadingSkeletonProps) {
  if (variant === "detail") {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="h-4 w-24 rounded bg-brand-surface" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <div className="aspect-[4/3] rounded-2xl bg-brand-surface" />
          <div className="space-y-4">
            <div className="h-6 w-24 rounded-full bg-brand-surface" />
            <div className="h-8 w-3/4 rounded bg-brand-surface" />
            <div className="h-8 w-32 rounded bg-brand-surface" />
            <div className="h-24 rounded-2xl bg-brand-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-brand-surface" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="h-10 w-48 rounded bg-brand-surface" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="aspect-[4/3] rounded-2xl bg-brand-surface" />
        ))}
      </div>
    </div>
  );
}
