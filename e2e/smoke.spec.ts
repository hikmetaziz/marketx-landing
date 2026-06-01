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
    await page.goto("/listings");
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

  test("sample listing detail loads", async ({ page }) => {
    await page.goto("/listings/paltaryuyan-masin");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Paltaryuyan");
  });
});
