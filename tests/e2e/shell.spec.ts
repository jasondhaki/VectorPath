import { test, expect, expectNoHorizontalOverflow, must, runAxe, MISSING_PATH } from "./fixtures";

// U02 shell checks run at every viewport project (375 / 1024 / 1440).

test("landing: one h1, no horizontal overflow, no third-party requests", async ({ page, blockedRequests }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("VectorPath");
  await expect(page.locator("main")).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  expect(blockedRequests).toEqual([]);
});

test("skip link is visible on first Tab and moves focus to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  const box = must(await skip.boundingBox(), "skip link box");
  const vp = must(page.viewportSize(), "viewport");
  expect(box.width).toBeGreaterThan(40);
  expect(box.height).toBeGreaterThan(20);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("keyboard focus ring is a visible 2px outline in the focus token", async ({ page }) => {
  await page.goto("/");
  const focusToken = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--focus").trim());
  expect(focusToken).toMatch(/^#[0-9a-f]{6}$/i);
  // Tab through every focusable control in the shell and assert the ring on each one.
  const seen = new Set<string>();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { key: el.outerHTML.slice(0, 80), style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor, visible: r.width > 0 && r.height > 0 };
    });
    if (!ring || seen.has(ring.key)) continue;
    seen.add(ring.key);
    expect(ring.visible, ring.key).toBe(true);
    expect(ring.style, ring.key).toBe("solid");
    expect(ring.width, ring.key).toBe("2px");
    const hex = focusToken.slice(1);
    const rgb = `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)})`;
    expect(ring.color, ring.key).toBe(rgb);
  }
  expect(seen.size, "at least skip link and brand are focusable").toBeGreaterThanOrEqual(2);
});

test("not-found boundary: 404 status, one h1, no overflow", async ({ page, blockedRequests }) => {
  const res = await page.goto(MISSING_PATH);
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.getByRole("link", { name: "Go to start" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(blockedRequests).toEqual([]);
});

test("/dev/components is not found under next start", async ({ page }) => {
  const res = await page.goto("/dev/components");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Component gallery" })).toHaveCount(0);
});

test("fonts load only from the app origin", async ({ page, blockedRequests, baseURL }) => {
  const fonts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "font") fonts.push(r.url());
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, "")),
  );
  expect(loaded).toContain("Barlow");
  expect(loaded).toContain("Barlow Semi Condensed");
  expect(fonts.length).toBeGreaterThan(0);
  for (const url of fonts) expect(url.startsWith(must(baseURL, "baseURL")), url).toBe(true);
  expect(blockedRequests).toEqual([]);
});

test("reduced motion stops the shipped animate-spin rule", async ({ browser, baseURL }) => {
  // The spinner (LoadingState) is only rendered by Suspense/dev routes, so probe the production CSS rule itself.
  const probe = async (reducedMotion: "reduce" | "no-preference") => {
    const ctx = await browser.newContext({ reducedMotion });
    const origin = new URL(must(baseURL, "baseURL")).origin;
    await ctx.route("**/*", (r) => (r.request().url().startsWith(origin) ? r.continue() : r.abort())); // I10 in this context too
    const page = await ctx.newPage();
    await page.goto(new URL("/", baseURL).href);
    const v = await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "animate-spin";
      document.body.append(el);
      const s = getComputedStyle(el);
      return { name: s.animationName, duration: s.animationDuration, count: s.animationIterationCount };
    });
    await ctx.close();
    return v;
  };
  const normal = await probe("no-preference");
  expect(normal.name, "animate-spin must exist in the shipped CSS").toBe("spin");
  expect(normal.count).toBe("infinite");
  const reduced = await probe("reduce");
  expect(reduced.count).toBe("1");
  expect(parseFloat(reduced.duration)).toBeLessThanOrEqual(0.001);
});

for (const path of ["/", MISSING_PATH]) {
  test(`axe WCAG A/AA (incl. color-contrast) has no violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    expect(await runAxe(page)).toEqual([]);
  });
}
