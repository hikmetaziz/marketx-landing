import Link from "next/link";

export function BrandLogo({ className = "", variant = "default" }: { className?: string; variant?: "default" | "light" }) {
  const color = variant === "light" ? "text-white" : "text-brand-text";
  return (
    <Link
      href="/"
      className={`font-extrabold tracking-tight ${color} ${className}`}
      aria-label="MarktX ana səhifə"
    >
      MarktX
    </Link>
  );
}
