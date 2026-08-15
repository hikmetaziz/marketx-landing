import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const outDir = join(tmpdir(), "marktx-contact-phone-test");
const tscBin = join(process.cwd(), "node_modules", "typescript", "bin", "tsc");

rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

execFileSync(
  process.execPath,
  [
    tscBin,
    "src/lib/contact-phone.ts",
    "--outDir",
    outDir,
    "--module",
    "es2022",
    "--target",
    "es2022",
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { stdio: "inherit" },
);

const { normalizeAzPhone } = await import(pathToFileURL(join(outDir, "contact-phone.js")).href);

const acceptedInputs = [
  "514711118",
  "0514711118",
  "51 471 11 18",
  "(051) 471-11-18",
  "+994514711118",
  "+994 51 471 11 18",
  "+994 (051) 471-11-18",
  "994514711118",
  "00994514711118",
];

for (const input of acceptedInputs) {
  assert.equal(normalizeAzPhone(input), "+994514711118", input);
}

const rejectedInputs = ["", "51 417", "05147111", "+99451471111899"];

for (const input of rejectedInputs) {
  assert.equal(normalizeAzPhone(input), null, input);
}

rmSync(outDir, { force: true, recursive: true });

console.log("contact phone normalization tests passed");
