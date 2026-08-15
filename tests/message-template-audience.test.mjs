import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const outDir = join(tmpdir(), "marktx-message-template-audience-test");
const tscBin = join(process.cwd(), "node_modules", "typescript", "bin", "tsc");

rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

execFileSync(
  process.execPath,
  [
    tscBin,
    "src/constants/message-templates.ts",
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

const {
  CUSTOMER_MESSAGE_TEMPLATES,
  MESSAGE_TEMPLATES_BY_AUDIENCE,
  STORE_MESSAGE_TEMPLATES,
  SUPPORT_MESSAGE_TEMPLATES,
} = await import(pathToFileURL(join(outDir, "message-templates.js")).href);

const customerCopy = JSON.stringify(CUSTOMER_MESSAGE_TEMPLATES);
assert.match(customerCopy, /Harada baxa bilərəm/);
assert.match(customerCopy, /Barter mümkündür/);

const storeCopy = JSON.stringify(STORE_MESSAGE_TEMPLATES);
assert.doesNotMatch(storeCopy, /Harada baxa bilərəm/);
assert.doesNotMatch(storeCopy, /Harada görüşüb baxa bilərəm/);
assert.doesNotMatch(storeCopy, /Barter/);
assert.doesNotMatch(storeCopy, /Endirim/);
assert.match(storeCopy, /Bəli, hələ satışdadır/);
assert.match(storeCopy, /Baxa biləcəyiniz ünvanı göndərirəm/);

assert.equal(MESSAGE_TEMPLATES_BY_AUDIENCE.customer, CUSTOMER_MESSAGE_TEMPLATES);
assert.equal(MESSAGE_TEMPLATES_BY_AUDIENCE.store, STORE_MESSAGE_TEMPLATES);
assert.equal(MESSAGE_TEMPLATES_BY_AUDIENCE.support, SUPPORT_MESSAGE_TEMPLATES);

rmSync(outDir, { force: true, recursive: true });

console.log("message template audience tests passed");
