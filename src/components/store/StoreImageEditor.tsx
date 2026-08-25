"use client";

import { Check, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";

import {
  exportStoreImage,
  type StoreCoverEditorMode,
} from "@/lib/stores/store-image-crop";
import type { StoreImageKind } from "@/lib/stores/store-images";

export function StoreImageEditor({
  sourceUrl,
  sourceName,
  kind,
  initialBackgroundColor,
  onCancel,
  onApply,
}: {
  sourceUrl: string;
  sourceName: string;
  kind: StoreImageKind;
  initialBackgroundColor: string;
  onCancel: () => void;
  onApply: (file: File) => Promise<void>;
}) {
  const isLogo = kind === "logo";
  const [mode, setMode] = useState<StoreCoverEditorMode>("fill");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isProcessing) onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProcessing, onCancel]);

  const changeMode = (nextMode: StoreCoverEditorMode) => {
    setMode(nextMode);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError("");
  };

  const handleApply = async () => {
    if (isProcessing) return;

    setError("");
    setIsProcessing(true);
    try {
      const file = await exportStoreImage({
        sourceUrl,
        sourceName,
        kind,
        mode,
        croppedAreaPixels,
        backgroundColor,
      });
      await onApply(file);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Şəkil hazırlana bilmədi. Yenidən cəhd edin.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-image-editor-title"
        className="max-h-[calc(100dvh-1rem)] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-3 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="store-image-editor-title" className="text-base font-bold text-brand-text sm:text-lg">
              {isLogo ? "Loqonu hazırla" : "Örtük şəklini hazırla"}
            </h2>
            <p className="mt-1 text-xs text-brand-muted sm:text-sm">
              {isLogo
                ? "Şəkli sürüşdürün və böyüdün. Şəffaf sahələr neytral fonla doldurulacaq."
                : "Yazı və loqo kəsilirsə, “Tam göstər” rejimini seçin."}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Bağla"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-border text-brand-muted hover:bg-brand-surface disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isLogo ? (
          <div className="mt-4 inline-flex rounded-lg border border-brand-border bg-brand-surface p-1" role="group" aria-label="Örtük rejimi">
            <button
              type="button"
              onClick={() => changeMode("fill")}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                mode === "fill" ? "bg-white text-brand-primary shadow-sm" : "text-brand-muted"
              }`}
            >
              Doldur
            </button>
            <button
              type="button"
              onClick={() => changeMode("fit")}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                mode === "fit" ? "bg-white text-brand-primary shadow-sm" : "text-brand-muted"
              }`}
            >
              Tam göstər
            </button>
          </div>
        ) : null}

        {mode === "fill" ? (
          <>
            <div
              className="relative mt-4 h-64 overflow-hidden rounded-lg bg-neutral-900 sm:h-96"
              style={isLogo ? { backgroundColor } : undefined}
            >
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                aspect={isLogo ? 1 : 5}
                objectFit="cover"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedAreaPixels(area)}
              />
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-brand-text">Böyütmə</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-brand-primary"
              />
            </label>
          </>
        ) : (
          <div className="mt-4">
            <div
              className="relative aspect-[5/1] w-full overflow-hidden rounded-lg border border-brand-border"
              style={{ backgroundColor }}
            >
              <Image
                src={sourceUrl}
                alt="Örtük önizləməsi"
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 720px"
                className="object-contain"
              />
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-brand-text">
              Boş sahələrin fonu
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setBackgroundColor(event.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-brand-border bg-white p-1"
                aria-label="Örtük fon rəngi"
              />
              <span className="font-mono text-xs font-normal text-brand-muted">{backgroundColor}</span>
            </label>
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-lg border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-text hover:bg-brand-surface disabled:opacity-50"
          >
            Ləğv et
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing || (mode === "fill" && !croppedAreaPixels)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isProcessing ? "Hazırlanır..." : "Tətbiq et"}
          </button>
        </div>
      </div>
    </div>
  );
}
