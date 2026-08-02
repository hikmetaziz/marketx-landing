import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const inputPath = path.join(repoRoot, "exports", "ecosoft-price-list", "ecosoft-price-list-clean.json");
const outputDir = path.join(repoRoot, "exports", "ecosoft-import-first30");
const outputImagesDir = path.join(outputDir, "images");
const publicImagesDir = path.join(repoRoot, "public", "images", "imports", "ecosoft-first30");
const sqlPath = path.join(repoRoot, "supabase", "ECOSOFT_IMPORT_FIRST30_PENDING.sql");
const uploadManifestPath = path.join(outputDir, "upload-manifest.json");

const ownerId = "ed40be7b-8b35-4a36-8c84-78c6d3f487a0";
const storeId = "42683efe-0872-4d2a-9849-a4dc0def59e4";
const categoryId = "e79900eb-47c5-4eaf-96e2-bfe6076d8409";
const subcategoryId = "e3435fcd-46d8-4fd7-9199-5c8cd96d5771";
const categoryName = "Ev və bağ";
const source = "ecosoft_price_list";
fs.mkdirSync(outputImagesDir, { recursive: true });
fs.mkdirSync(publicImagesDir, { recursive: true });

const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const products = Array.isArray(data) ? data : data.products || [];
const first30 = products.slice(0, 30);

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function cleanTitle(product) {
  const title = String(product.title || product.sku || "Ecosoft məhsulu").replace(/\s+/g, " ").trim();
  return title.length > 140 ? `${title.slice(0, 137).trim()}...` : title;
}

function svgFor(product) {
  const title = cleanTitle(product)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const sku = String(product.sku || "ECOSOFT")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="water" x1="0" x2="1">
      <stop offset="0" stop-color="#38bdf8"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity=".18"/>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="none"/>
  <g filter="url(#softShadow)">
    <rect x="365" y="185" width="470" height="500" rx="56" fill="#ffffff"/>
    <rect x="405" y="235" width="390" height="92" rx="28" fill="#e0f2fe"/>
    <rect x="440" y="370" width="92" height="230" rx="34" fill="#f8fafc" stroke="#94a3b8" stroke-width="12"/>
    <rect x="554" y="370" width="92" height="230" rx="34" fill="#f8fafc" stroke="#94a3b8" stroke-width="12"/>
    <rect x="668" y="370" width="92" height="230" rx="34" fill="#f8fafc" stroke="#94a3b8" stroke-width="12"/>
    <path d="M600 146c49 58 87 117 87 171 0 60-39 103-87 103s-87-43-87-103c0-54 38-113 87-171z" fill="url(#water)"/>
    <path d="M492 650h216" stroke="#2563eb" stroke-width="18" stroke-linecap="round"/>
    <path d="M445 710h310" stroke="#bae6fd" stroke-width="18" stroke-linecap="round"/>
  </g>
  <text x="600" y="790" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#0f172a">Ecosoft</text>
  <text x="600" y="836" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#475569">${sku}</text>
  <title>${title}</title>
</svg>`;
}

const rows = [];
const manifest = [];

for (const product of first30) {
  const listingId = crypto.randomUUID();
  const sku = String(product.sku || `row-${product.source_row}`).trim();
  const sourceImage = product.image_files?.[0] ? path.join(repoRoot, "exports", "ecosoft-price-list", product.image_files[0]) : null;
  let ext = "svg";
  let contentType = "image/svg+xml";
  let localImagePath = path.join(outputImagesDir, `${listingId}.svg`);
  let publicImagePath = path.join(publicImagesDir, `${listingId}.svg`);

  if (sourceImage && fs.existsSync(sourceImage)) {
    ext = path.extname(sourceImage).toLowerCase().replace(".", "") || "jpg";
    contentType = ext === "png" ? "image/png" : "image/jpeg";
    localImagePath = path.join(outputImagesDir, `${listingId}.${ext}`);
    publicImagePath = path.join(publicImagesDir, `${listingId}.${ext}`);
    fs.copyFileSync(sourceImage, localImagePath);
    fs.copyFileSync(sourceImage, publicImagePath);
  } else {
    fs.writeFileSync(localImagePath, svgFor(product), "utf8");
    fs.writeFileSync(publicImagePath, svgFor(product), "utf8");
  }

  const storagePath = `${ownerId}/${listingId}.${ext}`;
  const publicUrl = `/images/imports/ecosoft-first30/${listingId}.${ext}`;
  const description = [
    "Ecosoft price list importu.",
    `SKU: ${sku}`,
    `Kateqoriya: ${product.category || "Ecosoft"}`,
    "Stok: var",
  ].join("\n");

  rows.push({
    listingId,
    title: cleanTitle(product),
    price: Number(product.price_numeric),
    description,
    imageUrl: publicUrl,
    sku,
    sourceRow: product.source_row,
    ecosoftCategory: product.category || null,
    stockStatus: product.stock_status || "in_stock",
  });

  manifest.push({
    listingId,
    sku,
    localImagePath,
    storageUrl: `ss:///listing-images/${storagePath}`,
    contentType,
    publicUrl,
  });
}

const valueSql = rows
  .map((row) => {
    const attributes = {
      sku: row.sku,
      source_row: row.sourceRow,
      ecosoft_category: row.ecosoftCategory,
      stock_status: row.stockStatus,
      currency: "AZN",
    };
    return `  (${sql(row.listingId)}::uuid, ${sql(ownerId)}::uuid, ${sql(row.title)}, ${row.price}, ${sql(categoryName)}, ${sql(categoryId)}::uuid, ${sql(subcategoryId)}::uuid, 'Bakı', 'Yeni', 'new', ${sql(row.description)}, ${sql(row.imageUrl)}, array[${sql(row.imageUrl)}]::text[], ${sql(source)}, ${sql(storeId)}::uuid, ${sql(JSON.stringify(attributes))}::jsonb)`;
  })
  .join(",\n");

const importSql = `-- MarktX: Ecosoft first 30 listings import.
-- Idempotent by source + attributes.sku.

select set_config('request.jwt.claim.sub', ${sql(ownerId)}, true);
select set_config('request.jwt.claim.role', 'authenticated', true);

with import_rows (
  id,
  user_id,
  title,
  price,
  category,
  category_id,
  subcategory_id,
  city,
  condition,
  condition_code,
  description,
  image_url,
  image_urls,
  source,
  store_id,
  attributes
) as (
  values
${valueSql}
),
inserted as (
  insert into public.listings (
    id,
    user_id,
    title,
    price,
    category,
    category_id,
    subcategory_id,
    city,
    condition,
    condition_code,
    description,
    image_url,
    image_urls,
    source,
    store_id,
    attributes,
    status,
    listing_type,
    price_type,
    delivery_type,
    delivery_available
  )
  select
    r.id,
    r.user_id,
    r.title,
    r.price,
    r.category,
    r.category_id,
    r.subcategory_id,
    r.city,
    r.condition,
    r.condition_code,
    r.description,
    r.image_url,
    r.image_urls,
    r.source,
    r.store_id,
    r.attributes,
    'pending',
    'sell',
    'fixed',
    'pickup',
    false
  from import_rows r
  where not exists (
    select 1
    from public.listings l
    where l.source = r.source
      and l.attributes ->> 'sku' = r.attributes ->> 'sku'
  )
  returning id, title, attributes ->> 'sku' as sku, status
)
select jsonb_pretty(
  jsonb_build_object(
    'requested', (select count(*) from import_rows),
    'inserted', (select count(*) from inserted),
    'skipped_existing', (select count(*) from import_rows) - (select count(*) from inserted),
    'rows', coalesce((select jsonb_agg(to_jsonb(inserted)) from inserted), '[]'::jsonb)
  )
) as result;
`;

fs.writeFileSync(sqlPath, importSql, "utf8");
fs.writeFileSync(uploadManifestPath, JSON.stringify(manifest, null, 2), "utf8");

console.log(JSON.stringify({ sqlPath, uploadManifestPath, images: manifest.length }, null, 2));
