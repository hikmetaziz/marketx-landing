"use client";

import { MESSAGE_TEMPLATES } from "@/constants/message-templates";

type MessageTemplateChipsProps = {
  onSelect: (text: string) => void;
  disabled?: boolean;
};

export function MessageTemplateChips({ onSelect, disabled = false }: MessageTemplateChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-1 pb-2">
      {MESSAGE_TEMPLATES.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item.text)}
          className="shrink-0 rounded-full border border-brand-border bg-brand-primary-light/40 px-3 py-1.5 text-xs font-bold text-brand-primary transition-colors hover:border-brand-primary/30 disabled:opacity-50"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
