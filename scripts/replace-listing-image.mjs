// Local admin script: overwrite a listing image in Supabase Storage (upsert).
// Elevated access via service-role key loaded from .env.local. Never prints the key.
// Usage:
//   node scripts/replace-listing-image.mjs <userId> <listingId> <localFilePath> [ext=jpeg] [contentType=image/jpeg]
// The DB image_url is unchanged when the storage path (userId/listingId.ext) is reused.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  const env = {};
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[m[1]] = v;
    }
  }
  return env;
}

function fail(msg) {
  console.error("ERROR: " + msg);
  process.exit(1);
}

const [userId, listingId, localFilePath, ext = "jpeg", contentType = "image/jpeg"] = process.argv.slice(2);
if (!userId || !listingId || !localFilePath) {
  fail("args: <userId> <listingId> <localFilePath> [ext] [contentType]");
}

const env = { ...loadEnvLocal(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_ROLE ||
  env.SUPABASE_SERVICE_KEY ||
  env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL not found in .env.local");
if (!serviceKey) {
  fail("service-role key not found in .env.local (expected SUPABASE_SERVICE_ROLE_KEY)");
}
if (!existsSync(localFilePath)) fail("local file not found: " + localFilePath);

const bucket = "listing-images";
const path = `${userId}/${listingId}.${ext}`;
const body = readFileSync(localFilePath);

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { error } = await supabase.storage
  .from(bucket)
  .upload(path, body, { contentType, upsert: true });

if (error) fail("upload failed: " + error.message);

const { data } = supabase.storage.from(bucket).getPublicUrl(path);
console.log("OK uploaded: " + path + " (" + body.length + " bytes)");
console.log("public_url: " + data.publicUrl);
