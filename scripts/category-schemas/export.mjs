import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  buildSnapshot,
  formatJson,
  sha256,
  writeSeedFiles,
  writeTextFile,
} from "./canonical-v1.mjs";

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const webRoot = resolve(readArg("--web", process.cwd()));
const mobileRoot = resolve(readArg("--mobile", "F:/projects/mobile_apps/marktx-app"));
const skipMobile = process.argv.includes("--skip-mobile");

if (!existsSync(webRoot)) {
  throw new Error(`Web repo not found: ${webRoot}`);
}
if (!skipMobile && !existsSync(mobileRoot)) {
  throw new Error(`Mobile repo not found: ${mobileRoot}`);
}

const snapshot = buildSnapshot();
const json = formatJson(snapshot);
const hash = sha256(json);

const roots = skipMobile ? [webRoot] : [webRoot, mobileRoot];
for (const root of roots) {
  writeTextFile(join(root, "generated", "category-schemas.json"), json);
  writeTextFile(join(root, "generated", "category-schemas.sha256"), `${hash}\n`);
}

writeSeedFiles(webRoot);

console.log(`schema_hash=${hash}`);
console.log(`web_snapshot=${join(webRoot, "generated", "category-schemas.json")}`);
if (!skipMobile) {
  console.log(`mobile_snapshot=${join(mobileRoot, "generated", "category-schemas.json")}`);
}
console.log(`sql_seeds=${join(webRoot, "supabase", "seeds")}`);
