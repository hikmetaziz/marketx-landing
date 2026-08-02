import { createHash } from "node:crypto";

export const TAXONOMY_VERSION = 1;
export const TAXONOMY_VERSION_NAME = "marktx-taxonomy-auto-phone-electronics-v1";
export const GENERATED_FROM = "marktx-taxonomy-v1";

export const REQUIRED_PARENT_COUNT = 4;
export const REQUIRED_LEAF_COUNTS = new Map([
  ["automobile", 14],
  ["auto_parts", 16],
  ["phone", 30],
  ["electronics", 30],
]);
export const REQUIRED_LEAF_COUNT = 30;

export const NON_SUBCATEGORY_TERMS = new Set([
  "apple",
  "samsung",
  "xiaomi",
  "brand",
  "model",
  "body_type",
  "suv",
  "sedan",
  "kupe",
  "condition",
]);

export const TAXONOMY = [
  {
    key: "automobile",
    slug: "avtomobil-ve-neqliyyat",
    name: "Avtomobil və nəqliyyat",
    sort_order: 20,
    icon_key: "directions-car",
    catalogue_image_path: "/images/catalogue/avtomobil-ve-neqliyyat.png",
    color_hex: "#DBEAFE",
    aliases: ["avto", "avtomobil", "neqliyyat", "nəqliyyat"],
    groups: [
      {
        key: "auto-vehicles",
        label: "Nəqliyyat vasitələri",
        order: 1,
        leaves: [
          { slug: "avtomobiller", name: "Avtomobillər", order: 1, aliases: ["minik-avtomobili", "minik-avtomobilleri"] },
          { slug: "yuk-avtomobilleri", name: "Yük avtomobilləri", order: 2 },
          { slug: "mikroavtobuslar", name: "Mikroavtobuslar", order: 3 },
          { slug: "avtobuslar", name: "Avtobuslar", order: 4 },
          { slug: "motosikletler", name: "Motosikletlər", order: 5, aliases: ["motosiklet"] },
          { slug: "skuterler-ve-mopedler", name: "Skuterlər və mopedlər", order: 6 },
          { slug: "atv-ve-utv", name: "ATV və UTV", order: 7 },
          { slug: "elektrik-skuterler-ve-sexsi-neqliyyat", name: "Elektrik skuterlər və şəxsi nəqliyyat", order: 8 },
          { slug: "velosipedler", name: "Velosipedlər", order: 9 },
          { slug: "elektrik-velosipedler", name: "Elektrik velosipedlər", order: 10 },
          { slug: "qosqular-ve-yarimqosqular", name: "Qoşqular və yarımqoşqular", order: 11 },
          { slug: "xususi-texnika", name: "Xüsusi texnika", order: 12 },
          { slug: "kend-teserrufati-texnikasi", name: "Kənd təsərrüfatı texnikası", order: 13 },
          { slug: "su-neqliyyati", name: "Su nəqliyyatı", order: 14 },
        ],
      },
    ],
  },
  {
    key: "auto_parts",
    slug: "avto-ehtiyat-hisseleri-ve-avadanliq",
    name: "Avto ehtiyat hissələri və avadanlıq",
    sort_order: 25,
    icon_key: "car-repair",
    catalogue_image_path: "/images/catalogue/avto-ehtiyat-hisseleri-ve-avadanliq.png",
    color_hex: "#E0F2FE",
    aliases: ["ehtiyat-hisseleri", "avto-ehtiyat-hisseleri", "avto-avadanliq", "avto-aksesuarlar"],
    groups: [
      {
        key: "auto-parts-equipment",
        label: "Ehtiyat hissələri və avadanlıq",
        order: 1,
        leaves: [
          { slug: "muherrik-ve-hisseleri", name: "Mühərrik və hissələri", order: 1, aliases: ["muherrik-hisseleri"] },
          { slug: "transmissiya-ve-suretler-qutusu", name: "Transmissiya və sürətlər qutusu", order: 2 },
          { slug: "kuzov-hisseleri", name: "Kuzov hissələri", order: 3 },
          { slug: "optika-ve-isiqlandirma", name: "Optika və işıqlandırma", order: 4 },
          { slug: "asqi-ve-sukan-sistemi", name: "Asqı və sükan sistemi", order: 5 },
          { slug: "eylec-sistemi", name: "Əyləc sistemi", order: 6 },
          { slug: "elektrik-ve-alisdirma-hisseleri", name: "Elektrik və alışdırma hissələri", order: 7 },
          { slug: "yanacaq-ve-egzoz-sistemi", name: "Yanacaq və egzoz sistemi", order: 8 },
          { slug: "sinler", name: "Şinlər", order: 9 },
          { slug: "diskler", name: "Disklər", order: 10 },
          { slug: "akkumulyatorlar", name: "Akkumulyatorlar", order: 11 },
          { slug: "yaglar-mayeler-ve-avtokimya", name: "Yağlar, mayelər və avtokimya", order: 12 },
          { slug: "salon-aksesuarlari", name: "Salon aksesuarları", order: 13 },
          { slug: "xarici-aksesuarlar", name: "Xarici aksesuarlar", order: 14 },
          { slug: "avtoelektronika-ve-multimedia", name: "Avtoelektronika və multimedia", order: 15 },
          { slug: "servis-ve-diaqnostika-avadanligi", name: "Servis və diaqnostika avadanlığı", order: 16, aliases: ["avto-xidmetler"] },
        ],
      },
    ],
  },
  {
    key: "phone",
    slug: "telefon",
    name: "Telefon",
    sort_order: 30,
    icon_key: "smartphone",
    catalogue_image_path: "/images/catalogue/telefon.png",
    color_hex: "#DCFCE7",
    aliases: ["telefonlar", "mobil-telefonlar", "telefon-aksesuarlari"],
    groups: [
      {
        key: "phone-devices",
        label: "Telefon cihazları",
        order: 1,
        leaves: [
          { slug: "smartfonlar", name: "Smartfonlar", order: 1 },
          { slug: "dymeli-telefonlar", name: "Düyməli telefonlar", order: 2, aliases: ["duymeli-telefonlar"] },
          { slug: "ev-ve-ofis-telefonlari", name: "Ev və ofis telefonları", order: 3 },
          { slug: "radiotelefonlar", name: "Radiotelefonlar", order: 4 },
          { slug: "peyk-telefonlari", name: "Peyk telefonları", order: 5 },
        ],
      },
      {
        key: "phone-protection",
        label: "Qoruyucu məhsullar",
        order: 2,
        leaves: [
          { slug: "telefon-qablari", name: "Telefon qabları", order: 6 },
          { slug: "ekran-qoruyuculari", name: "Ekran qoruyucuları", order: 7 },
          { slug: "kamera-qoruyuculari", name: "Kamera qoruyucuları", order: 8 },
        ],
      },
      {
        key: "phone-charging-energy",
        label: "Şarj və enerji",
        order: 3,
        leaves: [
          { slug: "sarj-adapterleri", name: "Şarj adapterləri", order: 9 },
          { slug: "sarj-kabelleri", name: "Şarj kabelləri", order: 10 },
          { slug: "simsiz-sarj-cihazlari", name: "Simsiz şarj cihazları", order: 11 },
          { slug: "powerbanklar", name: "Powerbanklar", order: 12 },
          { slug: "avtomobil-sarj-cihazlari", name: "Avtomobil şarj cihazları", order: 13 },
        ],
      },
      {
        key: "phone-adapters-holders",
        label: "Adapter və tutacaqlar",
        order: 4,
        leaves: [
          { slug: "otg-ve-telefon-adapterleri", name: "OTG və telefon adapterləri", order: 14 },
          { slug: "sim-adapterleri-ve-sim-tray-lar", name: "SIM adapterləri və SIM tray-lar", order: 15 },
          { slug: "avtomobil-telefon-tutacaqlari", name: "Avtomobil telefon tutacaqları", order: 16 },
          { slug: "masaustu-telefon-tutacaqlari", name: "Masaüstü telefon tutacaqları", order: 17 },
          { slug: "selfie-cubuqlari-ve-mini-stativler", name: "Selfie çubuqları və mini ştativlər", order: 18 },
          { slug: "telefon-gimbal-ve-stabilizatorlari", name: "Telefon gimbal və stabilizatorları", order: 19 },
        ],
      },
      {
        key: "phone-spare-parts",
        label: "Telefon ehtiyat hissələri",
        order: 5,
        leaves: [
          { slug: "ekran-ve-sensorlar", name: "Ekran və sensorlar", order: 20 },
          { slug: "telefon-batareyalari", name: "Telefon batareyaları", order: 21 },
          { slug: "korpus-ve-cerciveler", name: "Korpus və çərçivələr", order: 22 },
          { slug: "telefon-kameralari", name: "Telefon kameraları", order: 23 },
          { slug: "sarj-portlari-ve-flex-kabeller", name: "Şarj portları və flex kabellər", order: 24 },
          { slug: "dinamik-ve-mikrofonlar", name: "Dinamik və mikrofonlar", order: 25 },
          { slug: "telefon-ana-platalari", name: "Telefon ana plataları", order: 26 },
          { slug: "duymeler-ve-kicik-hisseler", name: "Düymələr və kiçik hissələr", order: 27 },
          { slug: "diger-telefon-ehtiyat-hisseleri", name: "Digər telefon ehtiyat hissələri", order: 28 },
        ],
      },
      {
        key: "phone-repair-kits",
        label: "Təmir və komplektlər",
        order: 6,
        leaves: [
          { slug: "telefon-temir-aletleri", name: "Telefon təmir alətləri", order: 29 },
          { slug: "telefon-aksesuar-destleri", name: "Telefon aksesuar dəstləri", order: 30 },
        ],
      },
    ],
  },
  {
    key: "electronics",
    slug: "elektronika",
    name: "Elektronika",
    sort_order: 40,
    icon_key: "devices",
    catalogue_image_path: "/images/catalogue/elektronika.png",
    color_hex: "#EDE9FE",
    aliases: ["komputer", "kompüter", "komputerler", "elektronik"],
    groups: [
      {
        key: "electronics-computing-mobile",
        label: "Kompüter və mobil hesablama",
        order: 1,
        leaves: [
          { slug: "noutbuklar", name: "Noutbuklar", order: 1 },
          { slug: "masaustu-komputerler", name: "Masaüstü kompüterlər", order: 2 },
          { slug: "monobloklar", name: "Monobloklar", order: 3 },
          { slug: "planshetler", name: "Planşetlər", order: 4 },
          { slug: "elektron-kitablar", name: "Elektron kitablar", order: 5 },
        ],
      },
      {
        key: "electronics-components-accessories",
        label: "Kompüter komponentləri və aksesuarları",
        order: 2,
        leaves: [
          { slug: "monitorlar", name: "Monitorlar", order: 6 },
          { slug: "prosessorlar", name: "Prosessorlar", order: 7 },
          { slug: "ana-platalar", name: "Ana platalar", order: 8 },
          { slug: "videokartlar", name: "Videokartlar", order: 9 },
          { slug: "operativ-yaddas-ram", name: "Operativ yaddaş - RAM", order: 10 },
          { slug: "ssd-hdd-ve-yaddas-qurgulari", name: "SSD, HDD və yaddaş qurğuları", order: 11 },
          { slug: "korpus-qida-bloku-ve-soyutma", name: "Korpus, qida bloku və soyutma", order: 12 },
          { slug: "komputer-periferiyasi", name: "Kompüter periferiyası", order: 13 },
          { slug: "printerler-ve-skanerler", name: "Printerlər və skanerlər", order: 14 },
          { slug: "sebeke-avadanligi", name: "Şəbəkə avadanlığı", order: 15 },
        ],
      },
      {
        key: "electronics-tv-video",
        label: "TV və video",
        order: 3,
        leaves: [
          { slug: "televizorlar", name: "Televizorlar", order: 16 },
          { slug: "proyektorlar", name: "Proyektorlar", order: 17 },
          { slug: "tv-box-ve-media-pleyerler", name: "TV box və media pleyerlər", order: 18, aliases: ["televizor-audio"] },
          { slug: "peyk-ve-tv-avadanligi", name: "Peyk və TV avadanlığı", order: 19 },
        ],
      },
      {
        key: "electronics-audio",
        label: "Audio",
        order: 4,
        leaves: [
          { slug: "qulaqliqlar", name: "Qulaqlıqlar", order: 20 },
          { slug: "portativ-dinamikler", name: "Portativ dinamiklər", order: 21 },
          { slug: "ev-audio-sistemleri", name: "Ev audio sistemləri", order: 22 },
          { slug: "mikrofon-ve-audio-interfeysler", name: "Mikrofon və audio interfeyslər", order: 23 },
        ],
      },
      {
        key: "electronics-gaming",
        label: "Oyun",
        order: 5,
        leaves: [
          { slug: "oyun-konsollari", name: "Oyun konsolları", order: 24 },
          { slug: "oyun-aksesuarlari", name: "Oyun aksesuarları", order: 25, aliases: ["elektronika-aksesuarlari"] },
        ],
      },
      {
        key: "electronics-photo-wearable-smart",
        label: "Foto, wearable və ağıllı cihazlar",
        order: 6,
        leaves: [
          { slug: "foto-ve-videokameralar", name: "Foto və videokameralar", order: 26, aliases: ["foto-video"] },
          { slug: "obyektiv-ve-foto-video-aksesuarlari", name: "Obyektiv və foto/video aksesuarları", order: 27 },
          { slug: "smart-saat-ve-wearable-cihazlar", name: "Smart saat və wearable cihazlar", order: 28, aliases: ["smart-saatlar"] },
          { slug: "agilli-ve-tehlukesizlik-sistemleri", name: "Ağıllı və təhlükəsizlik sistemləri", order: 29 },
          { slug: "dronlar-ve-aksesuarlar", name: "Dronlar və aksesuarlar", order: 30 },
        ],
      },
    ],
  },
];

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function formatJson(value) {
  return `${JSON.stringify(JSON.parse(stableStringify(value)), null, 2)}\n`;
}

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function flattenLeaves(parent) {
  return parent.groups
    .flatMap((group) =>
      group.leaves.map((leaf) => ({
        ...leaf,
        parent_key: parent.key,
        parent_slug: parent.slug,
        parent_name: parent.name,
        group_key: group.key,
        group_label: group.label,
        group_order: group.order,
      })),
    )
    .sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug));
}

export function allLeaves() {
  return TAXONOMY.flatMap((parent) => flattenLeaves(parent));
}

export function buildSnapshot() {
  return {
    version: TAXONOMY_VERSION,
    version_name: TAXONOMY_VERSION_NAME,
    generated_from: GENERATED_FROM,
    parents: TAXONOMY.map((parent) => ({
      key: parent.key,
      slug: parent.slug,
      name: parent.name,
      sort_order: parent.sort_order,
      icon_key: parent.icon_key,
      catalogue_image_path: parent.catalogue_image_path,
      color_hex: parent.color_hex,
      aliases: [...(parent.aliases ?? [])].sort(),
      groups: [...parent.groups]
        .sort((left, right) => left.order - right.order)
        .map((group) => ({
          key: group.key,
          label: group.label,
          order: group.order,
          leaves: [...group.leaves]
            .sort((left, right) => left.order - right.order)
            .map((leaf) => ({
              slug: leaf.slug,
              name: leaf.name,
              order: leaf.order,
              aliases: [...(leaf.aliases ?? [])].sort(),
            })),
        })),
    })).sort((left, right) => left.sort_order - right.sort_order),
  };
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlValues(rows) {
  return rows.map((row) => `    (${row.map(sqlLiteral).join(", ")})`).join(",\n");
}

function uniqueAliasRows() {
  const rows = [];
  const seen = new Set();
  for (const parent of TAXONOMY) {
    for (const alias of parent.aliases ?? []) {
      const key = alias.toLocaleLowerCase("az");
      if (!seen.has(key)) {
        seen.add(key);
        rows.push([alias, parent.slug, ""]);
      }
    }
    for (const leaf of flattenLeaves(parent)) {
      for (const alias of leaf.aliases ?? []) {
        const key = alias.toLocaleLowerCase("az");
        if (!seen.has(key)) {
          seen.add(key);
          rows.push([alias, parent.slug, leaf.slug]);
        }
      }
    }
  }
  return rows.sort((left, right) => left[0].localeCompare(right[0], "az"));
}

export function buildSeedSql() {
  const parentRows = TAXONOMY.map((parent) => [
    parent.slug,
    parent.name,
    String(parent.sort_order),
    parent.icon_key,
    parent.catalogue_image_path,
    parent.color_hex,
  ]);
  const leafRows = TAXONOMY.flatMap((parent) =>
    flattenLeaves(parent).map((leaf) => [
      parent.slug,
      leaf.slug,
      leaf.name,
      String(leaf.order),
      leaf.group_key,
      leaf.group_label,
      String(leaf.group_order),
    ]),
  );
  const aliasRows = uniqueAliasRows();

  return `-- MarktX Taxonomy V1: auto, auto parts, phone, electronics.
-- Prepared only. Do not run against production without an approved staging apply.
-- Idempotent seed: upserts the prepared parent categories and leaf subcategories,
-- records group metadata, and preserves existing listing references by renaming
-- a few known legacy leaf slugs before insert where no canonical row exists.

begin;

alter table public.subcategories
  add column if not exists group_key text,
  add column if not exists group_label text,
  add column if not exists group_order integer,
  add column if not exists taxonomy_version text,
  add column if not exists is_listing_enabled boolean not null default true,
  add column if not exists is_filter_enabled boolean not null default true;

comment on column public.subcategories.group_key is 'Visual group key for non-selectable taxonomy grouping.';
comment on column public.subcategories.group_label is 'Visual group label for category browsing; not a selectable subcategory.';
comment on column public.subcategories.group_order is 'Display order of the visual group inside the parent category.';
comment on column public.subcategories.taxonomy_version is 'Prepared taxonomy version that last wrote this subcategory metadata.';

with parent_seed(slug, name, sort_order, icon_key, catalogue_image_path, color_hex) as (
  values
${sqlValues(parentRows)}
)
insert into public.categories (
  slug,
  name,
  sort_order,
  is_active,
  icon_key,
  catalogue_image_path,
  color_hex,
  home_visible
)
select slug, name, sort_order::integer, true, icon_key, catalogue_image_path, color_hex, true
from parent_seed
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  icon_key = excluded.icon_key,
  catalogue_image_path = excluded.catalogue_image_path,
  color_hex = excluded.color_hex,
  home_visible = true;

-- Safe legacy slug renames keep existing subcategory ids and listing FK references.
update public.subcategories s
set slug = 'avtomobiller', name = 'Avtomobillər', sort_order = 1
from public.categories c
where s.category_id = c.id
  and c.slug = 'avtomobil-ve-neqliyyat'
  and s.slug = 'minik-avtomobili'
  and not exists (
    select 1
    from public.subcategories existing
    where existing.category_id = c.id
      and existing.slug = 'avtomobiller'
  );

with leaf_seed(category_slug, slug, name, sort_order, group_key, group_label, group_order) as (
  values
${sqlValues(leafRows)}
)
insert into public.subcategories (
  category_id,
  slug,
  name,
  sort_order,
  is_active,
  group_key,
  group_label,
  group_order,
  taxonomy_version,
  is_listing_enabled,
  is_filter_enabled
)
select
  c.id,
  l.slug,
  l.name,
  l.sort_order::integer,
  true,
  l.group_key,
  l.group_label,
  l.group_order::integer,
  ${sqlLiteral(TAXONOMY_VERSION_NAME)},
  true,
  true
from leaf_seed l
join public.categories c on c.slug = l.category_slug
on conflict (category_id, slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  group_key = excluded.group_key,
  group_label = excluded.group_label,
  group_order = excluded.group_order,
  taxonomy_version = excluded.taxonomy_version,
  is_listing_enabled = true,
  is_filter_enabled = true;

with alias_seed(alias, category_slug, subcategory_slug) as (
  values
${sqlValues(aliasRows)}
)
insert into public.category_aliases (alias, category_id, subcategory_id, is_active)
select
  a.alias,
  c.id,
  s.id,
  true
from alias_seed a
join public.categories c on c.slug = a.category_slug
left join public.subcategories s
  on s.category_id = c.id
 and s.slug = nullif(a.subcategory_slug, '')
on conflict (alias) do update
set
  category_id = excluded.category_id,
  subcategory_id = excluded.subcategory_id,
  is_active = true;

commit;
`;
}

export function buildRollbackSql() {
  const aliases = uniqueAliasRows().map((row) => row[0]);
  const aliasList = aliases.map(sqlLiteral).join(",\n    ");
  return `-- MarktX Taxonomy V1 rollback.
-- Prepared only. This rollback intentionally avoids hard-deleting category or
-- subcategory rows so existing listing FK references are preserved.

begin;

update public.subcategories
set
  group_key = null,
  group_label = null,
  group_order = null,
  taxonomy_version = null
where taxonomy_version = ${sqlLiteral(TAXONOMY_VERSION_NAME)};

update public.category_aliases
set is_active = false
where alias in (
    ${aliasList}
);

commit;
`;
}
