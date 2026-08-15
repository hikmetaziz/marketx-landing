import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const outDir = join(tmpdir(), "marktx-phase-5-1-a-web");
const tscBin = join(process.cwd(), "node_modules", "typescript", "bin", "tsc");

rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

execFileSync(
  process.execPath,
  [
    tscBin,
    "src/lib/messaging/message-input.ts",
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

const { MESSAGE_BODY_MAX_LENGTH, canSubmitMessage, normalizeMessageBody, validateMessageBody } = await import(
  pathToFileURL(join(outDir, "message-input.js")).href
);

assert.equal(MESSAGE_BODY_MAX_LENGTH, 1000);
assert.deepEqual(validateMessageBody(""), { ok: false, reason: "empty", error: "Mesaj boş ola bilməz." });
assert.deepEqual(validateMessageBody("   "), { ok: false, reason: "empty", error: "Mesaj boş ola bilməz." });
assert.deepEqual(validateMessageBody("\n\n\t"), { ok: false, reason: "empty", error: "Mesaj boş ola bilməz." });
assert.equal(normalizeMessageBody("  salam  "), "salam");
assert.deepEqual(validateMessageBody("  salam  "), { ok: true, body: "salam" });
assert.deepEqual(validateMessageBody("Salam 👋✅"), { ok: true, body: "Salam 👋✅" });
assert.deepEqual(validateMessageBody("Ə, ğ, ş, ç, ö, ü, ı"), { ok: true, body: "Ə, ğ, ş, ç, ö, ü, ı" });
assert.deepEqual(validateMessageBody("<script>alert(1)</script>"), { ok: true, body: "<script>alert(1)</script>" });
assert.deepEqual(validateMessageBody("<img src=x onerror=alert(1)>"), { ok: true, body: "<img src=x onerror=alert(1)>" });
assert.deepEqual(validateMessageBody("<b>test</b>"), { ok: true, body: "<b>test</b>" });
assert.equal(validateMessageBody("a".repeat(MESSAGE_BODY_MAX_LENGTH)).ok, true);
assert.equal(validateMessageBody("a".repeat(MESSAGE_BODY_MAX_LENGTH + 1)).ok, false);
assert.equal(canSubmitMessage("Salam", false, true), true);
assert.equal(canSubmitMessage("Salam", true, true), false);
assert.equal(canSubmitMessage("   ", false, true), false);
assert.equal(canSubmitMessage("Salam", false, false), false);

const retryMessages = [];
let retryDraft = "  Retry message 👋  ";
let retryLastFailedDraft = "";
let retrySending = false;

const appendRetryMessage = (message) => {
  if (retryMessages.some((item) => item.id === message.id)) return;
  retryMessages.push(message);
};

const retrySend = async (text, sendImpl) => {
  const validation = validateMessageBody(text ?? retryDraft);
  if (!validation.ok || retrySending) return;

  retrySending = true;
  retryLastFailedDraft = "";

  try {
    const { data, error } = await sendImpl(validation.body);
    if (error) {
      retryLastFailedDraft = validation.body;
      return;
    }

    if (data) {
      appendRetryMessage(data);
      if (!text) retryDraft = "";
    }
  } finally {
    retrySending = false;
  }
};

await retrySend(undefined, async () => ({ data: null, error: "network" }));
assert.equal(retryDraft, "  Retry message 👋  ");
assert.equal(retryLastFailedDraft, "Retry message 👋");

let retryCalls = 0;
await Promise.all([
  retrySend(retryLastFailedDraft, async (body) => {
    retryCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { data: { id: "retry-1", body }, error: null };
  }),
  retrySend(retryLastFailedDraft, async (body) => {
    retryCalls += 1;
    return { data: { id: "retry-2", body }, error: null };
  }),
]);

assert.equal(retryCalls, 1);
assert.equal(retryMessages.length, 1);
assert.deepEqual(retryMessages[0], { id: "retry-1", body: "Retry message 👋" });

const chatPanel = readFileSync(new URL("../src/components/messaging/ChatPanel.tsx", import.meta.url), "utf8");
const messagingLib = readFileSync(new URL("../src/lib/messaging/index.ts", import.meta.url), "utf8");

assert.match(chatPanel, /sendingRef\.current/);
assert.match(chatPanel, /validateMessageBody\(text \?\? draft\)/);
assert.match(chatPanel, /setLastFailedDraft\(validation\.body\)/);
assert.match(chatPanel, /if \(!text\) setDraft\(""\)/);
assert.match(chatPanel, /onClick=\{\(\) => void handleSend\(lastFailedDraft\)\}/);
assert.match(chatPanel, /prev\.some\(\(item\) => item\.id === message\.id\)/);
assert.match(chatPanel, /maxLength=\{MESSAGE_BODY_MAX_LENGTH\}/);
assert.match(chatPanel, /disabled=\{!canSubmitMessage\(draft, sending, conversation\.can_send\)\}/);
assert.match(chatPanel, /\{deleted \? "Mesaj silindi" : message\.body\}/);
assert.doesNotMatch(chatPanel, /dangerouslySetInnerHTML/);
assert.doesNotMatch(chatPanel, /innerHTML/);

assert.match(messagingLib, /const trimmed = body\.trim\(\)/);
assert.match(messagingLib, /if \(!trimmed\) return/);
assert.match(messagingLib, /p_body: trimmed/);

rmSync(outDir, { force: true, recursive: true });

console.log("phase 5.1-A web message input/rendering security checks passed");
