import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const snapshotPath = join(root, "generated", "messaging-contract.json");
const webContractPath = join(root, "src", "lib", "messaging-contract", "contract.ts");
const mobileContractPath = process.argv.includes("--mobile")
  ? join(resolve(process.argv[process.argv.indexOf("--mobile") + 1]), "lib", "messaging-contract", "contract.ts")
  : null;

const errors = [];

if (!existsSync(snapshotPath)) errors.push(`missing ${snapshotPath}`);
if (!existsSync(webContractPath)) errors.push(`missing ${webContractPath}`);

let hash = "";
if (existsSync(snapshotPath)) {
  const content = readFileSync(snapshotPath);
  hash = createHash("sha256").update(content).digest("hex");
}

function assertContract(path, label) {
  if (!path) return;
  if (!existsSync(path)) {
    errors.push(`missing ${label} contract at ${path}`);
    return;
  }
  const content = readFileSync(path, "utf8");
  if (!content.includes(`MESSAGING_CONTRACT_HASH = "${hash}"`)) {
    errors.push(`${label} contract hash mismatch`);
  }
  for (const value of [
    "legacy_user_user",
    "customer_store",
    "customer_support",
    "store_support",
    "waiting_support",
    "sender_context",
  ]) {
    if (!content.includes(value)) errors.push(`${label} contract missing ${value}`);
  }
}

assertContract(webContractPath, "web");
assertContract(mobileContractPath, "mobile");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`messaging_contract_valid hash=${hash}`);
