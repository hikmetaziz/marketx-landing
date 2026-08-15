"""Mockup grid-dən kateqoriya ikonlarını kəsib public/images/catalogue/-ə yazır."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "category-mockup.png"
OUT_DIR = ROOT / "public" / "images" / "catalogue"

NAMES_ROW_MAJOR = [
    "dasinmaz-emlak",
    "avtomobil-ve-neqliyyat",
    "telefon",
    "elektronika",
    "meiset-texnikasi",
    "ev-ve-bag",
    "mebel-ve-interyer",
    "geyim-ve-aksesuar",
    "xidmetler",
    "is-elanlari",
    "usaq-mehsullari",
    "heyvanlar",
    "biznes-ve-avadanliq",
    "temir-ve-ustalar",
    "tehsil-ve-kurslar",
]

ICON_TOP_RATIO = 0.52
INNER_PAD = 12


def trim_to_content(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 10:
                continue
            if r > 245 and g > 245 and b > 245:
                continue
            found = True
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if not found:
        return rgba
    return rgba.crop((min_x, min_y, max_x + 1, max_y + 1))


def fit_icon(icon: Image.Image, size: int = 256) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    scale = min(220 / icon.width, 220 / icon.height)
    new_size = (max(1, int(icon.width * scale)), max(1, int(icon.height * scale)))
    resized = icon.resize(new_size, Image.Resampling.LANCZOS)
    ox = (size - new_size[0]) // 2
    oy = (size - new_size[1]) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def icon_from_cell(cell: Image.Image) -> Image.Image:
    w, h = cell.size
    icon_h = int(h * ICON_TOP_RATIO)
    icon = cell.crop((INNER_PAD, INNER_PAD, w - INNER_PAD, icon_h))
    return fit_icon(trim_to_content(icon))


def grid_boxes(img: Image.Image) -> tuple[list[tuple[int, int, int, int]], tuple[int, int, int, int]]:
    w, h = img.size
    pad_x = int(w * 0.043)
    pad_y = int(h * 0.047)
    gap_x = int(w * 0.014)
    gap_y = int(h * 0.018)
    cell_w = int((w - 2 * pad_x - 4 * gap_x) / 5)
    main_row_h = int((h - pad_y - int(h * 0.17) - 3 * gap_y) / 3)
    diger_h = int(h * 0.155)
    diger_y = pad_y + 3 * (main_row_h + gap_y) + gap_y

    cells: list[tuple[int, int, int, int]] = []
    for row in range(3):
        for col in range(5):
            x = pad_x + col * (cell_w + gap_x)
            y = pad_y + row * (main_row_h + gap_y)
            cells.append((x, y, x + cell_w, y + main_row_h))

    diger_x = (w - cell_w) // 2
    diger_box = (diger_x, diger_y, diger_x + cell_w, min(diger_y + diger_h, h))
    return cells, diger_box


def main() -> None:
    img = Image.open(SOURCE).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cells, diger_box = grid_boxes(img)

    for idx, box in enumerate(cells):
        cell = img.crop(box)
        icon = icon_from_cell(cell)
        out = OUT_DIR / f"{NAMES_ROW_MAJOR[idx]}.png"
        icon.save(out, optimize=True)
        print(f"wrote {out.name}")

    diger_cell = img.crop(diger_box)
    diger_icon = icon_from_cell(diger_cell)
    diger_out = OUT_DIR / "diger.png"
    diger_icon.save(diger_out, optimize=True)
    print(f"wrote {diger_out.name}")


if __name__ == "__main__":
    main()
