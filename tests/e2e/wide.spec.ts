import { test, expect, must, runAxeFull } from "./fixtures";

test("axe harness self-check: an injected low-contrast element is reported", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle"); // inject after hydration, or React discards the probe
  await page.evaluate(() => {
    const p = document.createElement("p");
    p.id = "qa-contrast-probe";
    p.textContent = "QA contrast probe";
    p.style.cssText = "color:#222;background:#111"; // test-only probe, never shipped
    document.querySelector("main")?.append(p);
  });
  await expect(page.locator("#qa-contrast-probe")).toBeVisible();
  const s = await runAxeFull(page);
  const contrast = s.violations.find((v) => v.id === "color-contrast");
  expect(contrast?.nodes.map((n) => n.target.join(" "))).toEqual(["#qa-contrast-probe"]);
});

// 1440 px only (project w1440): full 240 px sidebar with visible labels and legend.

test("sidebar is 240 px with visible labels and the unavailable legend", async ({ page }) => {
  await page.goto("/");
  const aside = page.locator("aside");
  expect(Math.round(must(await aside.boundingBox(), "aside box").width)).toBe(240);
  await expect(aside.getByText("Dimmed items are not available yet.")).toBeVisible();
  const firstLabel = aside.locator("nav li").first().locator("span").nth(0);
  await expect(firstLabel).toBeVisible();
  // Hover tooltips are hidden at xl, where labels are visible.
  await aside.locator("nav li").first().hover();
  await expect(aside.locator("nav li").first().locator("span[aria-hidden]").last()).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
});
