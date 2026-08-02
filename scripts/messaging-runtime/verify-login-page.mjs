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

async function main() {
  const env = await loadEnv(".env.test.local");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const requests = [];
  const consoleMessages = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/auth/v1/") || url.includes("/rest/v1/rpc/resolve_auth_email_for_phone")) {
      requests.push({ event: "request", method: request.method(), url: url.replace(/\?.*$/, "") });
    }
  });
  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/auth/v1/") || url.includes("/rest/v1/rpc/resolve_auth_email_for_phone")) {
      requests.push({ event: "response", status: response.status(), url: url.replace(/\?.*$/, "") });
    }
  });

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.locator("#auth-phone").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#auth-phone").fill("511111112");
  await page.locator("#auth-password").fill(env.MARKTX_TEST_STORE_OWNER_B_PASSWORD);
  const submit = page.locator('form button[type="submit"]');
  const before = {
    phoneValue: await page.locator("#auth-phone").inputValue(),
    passwordLength: (await page.locator("#auth-password").inputValue()).length,
    submitCount: await submit.count(),
    submitDisabled: await submit.getAttribute("disabled").catch(() => null),
    submitText: await submit.textContent().catch(() => null),
  };
  await submit.click();

  await page.waitForTimeout(7000);

  const alertText = await page
    .locator('[role="alert"]')
    .textContent({ timeout: 1000 })
    .catch(() => null);

  console.log(
    JSON.stringify(
      {
        before,
        finalUrl: page.url(),
        alertText,
        formText: await page.locator("form").innerText({ timeout: 1000 }).catch(() => null),
        requests,
        consoleMessages,
        pageErrors,
        loggedInSignal: page.url() !== "http://localhost:3000/login",
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
