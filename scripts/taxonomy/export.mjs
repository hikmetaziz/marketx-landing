import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import {
  buildRollbackSql,
  buildSeedSql,
  buildSnapshot,
  formatJson,
  sha256,
  TAXONOMY_VERSION_NAME,
} from "./marktx-taxonomy-v1.mjs";

function writeTextFile(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

const rootDir = resolve(process.cwd());
const snapshotJson = formatJson(buildSnapshot());
const snapshotHash = sha256(snapshotJson);
const snapshotPath = join(rootDir, "generated", `${TAXONOMY_VERSION_NAME}.json`);
const hashPath = join(rootDir, "generated", `${TAXONOMY_VERSION_NAME}.sha256`);
const seedPath = join(
  rootDir,
  "supabase",
  "seeds",
  "SEED_MARKTX_TAXONOMY_AUTO_PHONE_ELECTRONICS_V1.sql",
);
const rollbackPath = join(
  rootDir,
  "supabase",
  "seeds",
  "SEED_MARKTX_TAXONOMY_AUTO_PHONE_ELECTRONICS_V1_ROLLBACK.sql",
);

writeTextFile(snapshotPath, snapshotJson);
writeTextFile(hashPath, `${snapshotHash}  ${snapshotPath.replaceAll("\\", "/")}\n`);
writeTextFile(seedPath, buildSeedSql());
writeTextFile(rollbackPath, buildRollbackSql());

console.log(`taxonomy_export=pass snapshot=${snapshotPath} sha256=${snapshotHash}`);
