import { test, expect, expectNoHorizontalOverflow, must, runAxe } from "./fixtures";

// 375 px only (project w375): bottom bar + modal menu dialog.

test("bottom bar is shown, rail is hidden and the bar never covers main content", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator("nav[aria-label='Main']").filter({ has: page.locator("ul") }).last();
  await expect(bar).toBeVisible();
  await expect(page.locator("aside")).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const { contentBottom, barTop } = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) throw new Error("no main");
    const navs = [...document.querySelectorAll("nav[aria-label='Main']")].filter((n) => (n as HTMLElement).offsetParent !== null || getComputedStyle(n).position === "fixed");
    const fixedBar = navs.find((n) => getComputedStyle(n).position === "fixed");
    if (!fixedBar) throw new Error("no fixed bottom bar");
    return {
      contentBottom: main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom),
      barTop: fixedBar.getBoundingClientRect().top,
    };
  });
  expect(contentBottom).toBeLessThanOrEqual(barTop);
});

test("menu dialog: modal, named, focus stays inside, Esc closes and focus returns to Menu", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "More" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("navigation", { name: "More" })).toHaveCount(1);
  expect(await dialog.evaluate((d) => d.matches(":modal"))).toBe(true);
  await expectNoHorizontalOverflow(page);

  // Focus must never land on page content outside the dialog while it is open.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body || a === document.documentElement) return "none";
      return a.closest("dialog") ? "inside" : `outside:${a.outerHTML.slice(0, 60)}`;
    });
    expect(where === "inside" || where === "none", where).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();
});

test("menu dialog: Close button closes and focus returns to Menu", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.getByRole("dialog", { name: "More" })).toBeHidden();
  await expect(menu).toBeFocused();
});

test("menu dialog: backdrop click closes and focus returns to Menu", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "More" });
  const box = must(await dialog.boundingBox(), "dialog box");
  expect(box.y, "sheet must leave backdrop above it").toBeGreaterThan(20);
  await page.mouse.click(10, 10); // backdrop area above the bottom sheet
  await expect(dialog).toBeHidden();
  await expect(menu).toBeFocused();
});

test("axe WCAG A/AA has no violations with the menu open", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
  expect(await runAxe(page)).toEqual([]);
});
