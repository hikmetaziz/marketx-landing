"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

type ListingShareButtonProps = {
  title: string;
  className?: string;
  variant?: "default" | "tertiary";
};

export function ListingShareButton({
  title,
  className = "",
  variant = "default",
}: ListingShareButtonProps) {
  const [shareMessage, setShareMessage] = useState("");

  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareMessage("Link kopyalandı");
      window.setTimeout(() => setShareMessage(""), 2500);
    } catch {
      setShareMessage("");
    }
  };

  const buttonClass =
    variant === "tertiary"
      ? "flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
      : "flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border/80 bg-brand-surface/50 px-4 py-3 text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface";

  return (
    <div className={className}>
      <button type="button" onClick={handleShare} className={buttonClass}>
        <Share2 className="h-4 w-4" />
        Paylaş
      </button>
      {shareMessage ? <p className="mt-1.5 text-center text-xs text-brand-muted">{shareMessage}</p> : null}
    </div>
  );
}
