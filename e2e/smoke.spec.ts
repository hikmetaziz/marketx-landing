import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("MarktX");
  });

  test("about page loads", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("listings page loads", async ({ page }) => {
    await page.goto("/elanlar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Elanlar");
  });

  test("categories page loads", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("invalid category shows not found page", async ({ page }) => {
    await page.goto("/categories/invalid-category-slug-xyz");
    await expect(page.getByRole("heading", { name: "Səhifə tapılmadı" })).toBeVisible();
  });

  test("category slug page loads", async ({ page }) => {
    await page.goto("/categories/telefon");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Telefon");
  });

  test("category subcategory chips when seeded", async ({ page }) => {
    await page.goto("/categories/telefon");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Telefon");

    const subNav = page.getByRole("navigation", { name: "Alt kateqoriyalar" });
    if ((await subNav.count()) === 0) {
      test.skip(true, "DB-də subcategories seed olunmayıb (TAXONOMY_16_CATALOGUE.sql §4)");
      return;
    }

    await expect(subNav).toBeVisible();
    await expect(subNav.getByRole("link", { name: "Hamısı" })).toBeVisible();
    const subLink = subNav.getByRole("link", { name: "Smartfonlar" });
    await expect(subLink).toBeVisible();
    const href = await subLink.getAttribute("href");
    expect(href).toMatch(/\/categories\/telefon\?sub=/);
  });

  test("create listing redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/create-listing", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("sample listing detail loads", async ({ page }) => {
    await page.goto("/elanlar/kofe-masini");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Kofe maşını");
  });
});
