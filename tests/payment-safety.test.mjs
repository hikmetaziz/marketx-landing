import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  {
    name: "web",
    file: path.join(root, "src/lib/messaging/payment-safety.ts"),
  },
  {
    name: "mobile",
    file: "F:/projects/mobile_apps/marktx-app/lib/messaging/payment-safety.ts",
  },
];

async function loadTsModule(file) {
  const source = await readFile(file, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const mod = new Module(file);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod._compile(outputText, file);
  return mod.exports;
}

const allowCases = [
  "Qiyməti nə qədərdir?",
  "Telefon nömrənizi göndərin",
  "Məhsul 450 AZN-dir?",
  "Model A05 2026",
  "051 471 11 18",
  "Müqavilə nömrəsi MX-2026-001",
  "Elan ID 1acaf095-94ab-4bc6-b068-f1f2ad6a12de",
  "12.08.2026 tarixində baxa bilərəm",
  "Serial SN-A05-2026-XYZ",
  "PIN kodlu qapıdır",
  "Məhsulun PIN-i var?",
  "SMS gəldi",
  "Son istifadə tarixi nədir?",
  "Kartın rəngi nədir?",
  "Arxa tərəfin şəklini göndərin",
  "1000 AZN",
];

const warnCases = [
  "Ödəniş üçün kart nömrənizi göndərin",
  "Kart nömrəsini göndərin, ödəniş edim",
  "Kartdan karta ödəyə bilərəm?",
  "IBAN göndərin",
  "4111 1111 1111 1111",
  "kart numaranı gönder",
  "IBAN gönder",
  "отправьте номер карты",
  "отправьте IBAN",
  "send your card number",
  "send your IBAN",
];

const blockCases = [
  "CVV-ni göndərin",
  "SMS kodunu mənə göndər",
  "Bankdan gələn OTP-ni yaz",
  "OTP kodu gəldi?",
  "PIN kodunu yazın",
  "Kartın arxasındakı CVV-ni göndər",
  "Kartın ön və arxa şəklini göndər",
  "Kartın son istifadə tarixini və CVV-ni yaz",
  "Mobil bank şifrənizi göndərin",
  "CVV kodunu gönder",
  "SMS doğrulama kodunu söyle",
  "mobil bankacılık şifreni gönder",
  "отправьте CVV",
  "пришлите код из SMS",
  "пришлите пароль от мобильного банка",
  "send me the CVV",
  "send the OTP code",
  "send your online banking password",
  "send a photo of the back of the card",
];

for (const target of targets) {
  const { classifyPaymentSafety } = await loadTsModule(target.file);

  for (const text of allowCases) {
    assert.equal(classifyPaymentSafety(text).level, "ALLOW", `${target.name} ALLOW: ${text}`);
  }

  for (const text of warnCases) {
    assert.equal(classifyPaymentSafety(text).level, "WARN_AND_ALLOW", `${target.name} WARN: ${text}`);
  }

  for (const text of blockCases) {
    assert.equal(classifyPaymentSafety(text).level, "BLOCK", `${target.name} BLOCK: ${text}`);
  }
}

const sendPathFiles = [
  {
    name: "web chat send",
    file: path.join(root, "src/components/messaging/ChatPanel.tsx"),
    before: "const safety = classifyPaymentSafety(validation.body);",
    after: "sendConversationMessage(supabase, conversationId, validation.body)",
  },
  {
    name: "web chat edit",
    file: path.join(root, "src/components/messaging/ChatPanel.tsx"),
    before: "const safety = classifyPaymentSafety(validation.body);",
    after: "editConversationMessage(supabase, { messageId: message.id, body: validation.body })",
  },
  {
    name: "web customer support start",
    file: path.join(root, "src/components/messaging/SupportStartPanel.tsx"),
    before: "const safety = classifyPaymentSafety(`${cleanSubject}\\n${cleanDetails}`);",
    after: "getOrCreateCustomerSupportConversation",
  },
  {
    name: "web store support start",
    file: path.join(root, "src/components/messaging/StoreMessagingPanel.tsx"),
    before: "const safety = classifyPaymentSafety(`${cleanSubject}\\n${cleanDetails}`);",
    after: "getOrCreateStoreSupportConversation",
  },
  {
    name: "mobile chat send",
    file: "F:/projects/mobile_apps/marktx-app/app/chat/[id].tsx",
    before: "const safety = classifyPaymentSafety(validation.body);",
    after: "sendConversationMessage(conversationId, validation.body)",
  },
  {
    name: "mobile chat edit",
    file: "F:/projects/mobile_apps/marktx-app/app/chat/[id].tsx",
    before: "const safety = classifyPaymentSafety(validation.body);",
    after: "editConversationMessage({ messageId: message.id, body: validation.body })",
  },
  {
    name: "mobile customer support start",
    file: "F:/projects/mobile_apps/marktx-app/app/support.tsx",
    before: "const safety = classifyPaymentSafety(`${cleanSubject}\\n${firstMessage}`);",
    after: "getOrCreateCustomerSupportConversation",
  },
];

for (const item of sendPathFiles) {
  const source = await readFile(item.file, "utf8");
  const beforeIndex = source.indexOf(item.before);
  const afterIndex = beforeIndex === -1 ? -1 : source.indexOf(item.after, beforeIndex);
  assert.notEqual(beforeIndex, -1, `${item.name}: missing classifier gate`);
  assert.notEqual(afterIndex, -1, `${item.name}: missing send/edit/create call`);
  assert.ok(beforeIndex < afterIndex, `${item.name}: classifier must run before RPC/send path`);
  assert.equal(/console\.(log|warn|error|info|debug)/.test(source), false, `${item.name}: should not log raw message content`);
}

console.log("payment-safety classifier tests passed");
