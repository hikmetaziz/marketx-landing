import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

async function loadEnv(file) {
  const text = await readFile(file, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function pageText(page) {
  return page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
}

async function main() {
  const env = await loadEnv(".env.test.local");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.locator("#auth-phone").fill("511111112");
  await page.locator("#auth-password").fill(env.MARKTX_TEST_STORE_OWNER_B_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForTimeout(7000);

  await page.goto("http://localhost:3000/account/messages", { waitUntil: "networkidle" });
  const messagesText = await pageText(page);

  await page.goto("http://localhost:3000/account/store", { waitUntil: "networkidle" });
  await page.waitForTimeout(7000);
  const storeText = await pageText(page);

  console.log(
    JSON.stringify(
      {
        messagesUrl: page.url(),
        accountMessages: {
          hasEmptyText: messagesText.includes("Hələ mesaj yoxdur") || messagesText.includes("HÉ™lÉ™ mesaj yoxdur"),
          hasStoreName: messagesText.includes("Messaging Test Store"),
          hasCustomerMessage: messagesText.includes("Müştəri") || messagesText.includes("MÃ¼ÅŸtÉ™ri"),
          excerpt: messagesText.slice(0, 800),
        },
        accountStore: {
          hasStoreName: storeText.includes("Messaging Test Store"),
          hasCustomerMessagesBlock: storeText.includes("Müştəri mesajları") || storeText.includes("MÃ¼ÅŸtÉ™ri mesajlarÄ±"),
          hasNoCustomerMessagesText:
            storeText.includes("Müştəri mesajı yoxdur") || storeText.includes("MÃ¼ÅŸtÉ™ri mesajÄ± yoxdur"),
          excerpt: storeText.slice(0, 1000),
        },
      },
      null,
      2,
    ),
  );

  await browser.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
