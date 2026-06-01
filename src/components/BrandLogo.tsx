import Link from "next/link";

export function BrandName({ className = "" }: { className?: string }) {
  return (
    <>
      <span className={`text-[#ff8c00] ${className}`.trim()}>Markt</span>
      <span className={`text-[#00c8e8] ${className}`.trim()}>X</span>
    </>
  );
}

export function BrandLogo({
  className = "",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  return (
    <Link
      href="/"
      className={`font-extrabold tracking-tight ${className}`}
      aria-label="MarktX ana səhifə"
    >
      <BrandName />
    </Link>
  );
}
