import { test, expect } from "./fixtures";

test("landing renders with no third-party requests", async ({ page, blockedRequests }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("VectorPath");
  expect(blockedRequests).toEqual([]);
});
