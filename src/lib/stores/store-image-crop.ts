import type { Area } from "react-easy-crop";

import type { StoreImageKind } from "@/lib/stores/store-images";

export type StoreCoverEditorMode = "fill" | "fit";

type ExportStoreImageOptions = {
  sourceUrl: string;
  sourceName: string;
  kind: StoreImageKind;
  mode: StoreCoverEditorMode;
  croppedAreaPixels: Area | null;
  backgroundColor: string;
};

const OUTPUT_SIZE: Record<StoreImageKind, { width: number; height: number }> = {
  logo: { width: 500, height: 500 },
  cover: { width: 1600, height: 320 },
};

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Şəkil oxunmadı. Başqa fayl seçin."));
    image.src = sourceUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Şəkil hazırlana bilmədi. Yenidən cəhd edin.")),
      "image/jpeg",
      0.9,
    );
  });
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  context.drawImage(image, x, y, drawWidth, drawHeight);
}

export async function exportStoreImage({
  sourceUrl,
  sourceName,
  kind,
  mode,
  croppedAreaPixels,
  backgroundColor,
}: ExportStoreImageOptions): Promise<File> {
  const image = await loadImage(sourceUrl);
  const { width, height } = OUTPUT_SIZE[kind];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Şəkil redaktoru açılmadı. Yenidən cəhd edin.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, width, height);

  if (kind === "cover" && mode === "fit") {
    drawContainedImage(context, image, width, height);
  } else {
    if (!croppedAreaPixels) {
      throw new Error("Şəkil sahəsini seçin.");
    }

    context.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      width,
      height,
    );
  }

  const outputType = "image/jpeg";
  const blob = await canvasToBlob(canvas);
  const baseName = sourceName.replace(/\.[^.]+$/, "").slice(0, 80) || kind;

  return new File([blob], `${baseName}-${kind}.jpg`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

export async function suggestStoreCoverBackground(sourceUrl: string): Promise<string> {
  const image = await loadImage(sourceUrl);
  const sampleSize = 48;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "#f3f4f6";

  context.drawImage(image, 0, 0, sampleSize, sampleSize);
  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = 0; y < sampleSize; y += 1) {
    for (let x = 0; x < sampleSize; x += 1) {
      if (x > 2 && x < sampleSize - 3 && y > 2 && y < sampleSize - 3) continue;

      const index = (y * sampleSize + x) * 4;
      if (pixels[index + 3] < 64) continue;

      red += pixels[index];
      green += pixels[index + 1];
      blue += pixels[index + 2];
      count += 1;
    }
  }

  if (count === 0) return "#f3f4f6";

  return `#${[red, green, blue]
    .map((channel) => Math.round(channel / count).toString(16).padStart(2, "0"))
    .join("")}`;
}
