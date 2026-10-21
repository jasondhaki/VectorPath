import { test, expect, must } from "./fixtures";

// 1024 px only (project w1024): 64 px icon rail with visual hover tooltips.

test("rail is 64 px, bottom bar and Menu are hidden", async ({ page }) => {
  await page.goto("/");
  const aside = page.locator("aside");
  await expect(aside).toBeVisible();
  expect(Math.round(must(await aside.boundingBox(), "aside box").width)).toBe(64);
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
});

test("rail tooltip is visible on hover and not clipped or covered", async ({ page }) => {
  await page.goto("/");
  const items = page.locator("aside nav li");
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    await item.hover();
    const tip = item.locator("span[aria-hidden]").last();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText(/not available yet|\w/);
    if (i === 0) await test.info().attach("rail-tooltip-1024", { body: await page.screenshot({ clip: { x: 0, y: 0, width: 400, height: 200 } }), contentType: "image/png" });
    const result = await tip.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const inViewport = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      // Any clipping ancestor must contain the tooltip box.
      let clipped: string | null = null;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if ([s.overflow, s.overflowX, s.overflowY].some((o) => o !== "visible")) {
          const ar = a.getBoundingClientRect();
          if (r.left < ar.left || r.right > ar.right || r.top < ar.top || r.bottom > ar.bottom) clipped = a.tagName;
        }
      }
      // Occlusion: temporarily make the tooltip hit-testable and probe its corners.
      const prev = (el as HTMLElement).style.pointerEvents;
      (el as HTMLElement).style.pointerEvents = "auto";
      // Probe inside the rounded corners (corner pixels outside the border radius are not hit-testable).
      const midY = (r.top + r.bottom) / 2;
      const pts: [number, number][] = [[r.left + 8, midY], [(r.left + r.right) / 2, midY], [r.right - 8, midY], [r.right - 8, r.top + 4], [r.right - 8, r.bottom - 4]];
      let covered: string | null = null;
      for (const [x, y] of pts) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !(hit === el || el.contains(hit))) covered ??= `(${Math.round(x)},${Math.round(y)}) ${hit ? hit.outerHTML.slice(0, 120) : "nothing"}`;
      }
      (el as HTMLElement).style.pointerEvents = prev;
      return { inViewport, clipped, covered, width: r.width };
    });
    expect(result.inViewport, `item ${i} tooltip inside viewport`).toBe(true);
    expect(result.clipped, `item ${i} tooltip clipped by ancestor`).toBeNull();
    expect(result.covered, `item ${i} tooltip covered by another element`).toBeNull();
    expect(result.width).toBeGreaterThan(20);
  }
});
