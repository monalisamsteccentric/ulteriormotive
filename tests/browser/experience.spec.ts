import { test, expect } from "@playwright/test";
test("landing, modal, filters and responsive layout", async ({ page }) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.route("**/api/public", (route) =>
    route.fulfill({
      json: {
        tiles: [],
        count: 0,
        content: [
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            title: "An unexpected perspective",
            description: "Something worth your attention.",
            url: "https://example.com",
            category: "Read",
            duration_minutes: 5,
            position: 0,
            enabled: true,
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Small discoveries.",
  );
  await expect(
    page.getByRole("heading", { name: "An unexpected perspective" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Watch", exact: true }).click();
  await expect(page.getByText("Nothing in this collection yet.")).toBeVisible();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Step into the mosaic" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("checkbox")).not.toBeChecked();
  await modal.getByLabel("Display name").fill("Mira");
  await modal.getByRole("button", { name: "mint", exact: true }).click();
  await expect(
    modal.getByRole("button", { name: "mint", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await page.getByRole("tab", { name: /The mosaic/ }).click();
  await expect(
    page.getByRole("heading", { name: "A whole world of possibility." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(failures).toEqual([]);
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-landing.png",
    fullPage: true,
  });
});
test("privacy and terms contain data controls and consent details", async ({
  page,
}) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy notice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Manage my tile" }),
  ).toHaveAttribute("href", "/#experience");
  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms of participation" }),
  ).toBeVisible();
  await expect(page.getByText(/18 and over/)).toBeVisible();
});
test("admin requires credentials and server protects mutations", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  const response = await request.post("/api/admin/content", { data: {} });
  expect(response.status()).toBe(401);
  const crossSite = await request.post("/api/join", {
    headers: { "sec-fetch-site": "cross-site" },
    data: {},
  });
  expect(crossSite.status()).toBe(403);
  const oversized = await request.post("/api/join", {
    data: { alias: "x".repeat(20000) },
  });
  expect(oversized.status()).toBe(413);
});
