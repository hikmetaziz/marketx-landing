"use client";

import { Loader2, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ConversationActionsMenuProps = {
  archiving?: boolean;
  blocking?: boolean;
  closing?: boolean;
  onArchive: () => void;
  onBlock?: () => void;
  onClose?: () => void;
};

export function ConversationActionsMenu({
  archiving = false,
  blocking = false,
  closing = false,
  onArchive,
  onBlock,
  onClose,
}: ConversationActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const busy = archiving || blocking || closing;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleArchive = () => {
    setOpen(false);
    onArchive();
  };

  const handleBlock = () => {
    setOpen(false);
    onBlock?.();
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={busy}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-muted transition-colors hover:border-brand-primary/30 hover:bg-brand-surface disabled:opacity-50"
        title="Yazışma seçimləri"
        aria-label="Yazışma seçimləri"
        aria-expanded={open}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-30 w-44 overflow-hidden rounded-xl border border-brand-border bg-white py-1 shadow-lg">
          {onBlock ? (
            <button
              type="button"
              onClick={handleBlock}
              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface"
            >
              Blok et
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={handleClose}
              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-brand-text transition-colors hover:bg-brand-surface"
            >
              Söhbəti bağla
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleArchive}
            className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            Yazışmanı sil
          </button>
        </div>
      ) : null}
    </div>
  );
}
