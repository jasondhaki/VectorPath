import { createRequire } from "node:module";
import { test as base, expect, type Page } from "@playwright/test";

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//;

// Browser-side third-party block (I10): any non-local request is aborted and recorded.
export const test = base.extend<{ blockedRequests: string[] }>({
  blockedRequests: async ({ page }, provide) => {
    const blocked: string[] = [];
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (LOCAL.test(url) || url.startsWith("data:")) return route.continue();
      blocked.push(url);
      return route.abort();
    });
    await provide(blocked);
  },
});
export { expect };

export const MISSING_PATH = "/qa-route-that-does-not-exist";

/** Narrow a nullable value or fail the test with a named reason. */
export function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`QA: missing ${what}`);
  return value;
}

/** Fails (does not skip) when the page scrolls horizontally. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, "document scrollWidth must not exceed clientWidth").toBeLessThanOrEqual(client);
}

// axe-core is resolved from node_modules (currently present only as a transitive dependency; an explicit
// devDependency was requested from lead). A missing package fails the test rather than skipping it.
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

export interface AxeViolation {
  id: string;
  impact: string | null;
  nodes: { target: string[] }[];
}

export interface AxeSummary {
  violations: AxeViolation[];
  /** Rule ids that passed or were incomplete; proves the run was not vacuous. */
  passed: string[];
  incomplete: string[];
}

/** Runs axe WCAG 2.x A/AA rules (including color-contrast) in the rendered page. */
export async function runAxeFull(page: Page): Promise<AxeSummary> {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => {
    type R = { id: string; impact: string | null; nodes: { target: string[] }[] };
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: R[]; passes: R[]; incomplete: R[] }> } }).axe;
    const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return {
      violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ target: n.target })) })),
      passed: r.passes.map((p) => p.id),
      incomplete: r.incomplete.map((p) => p.id),
    };
  });
}

/** Violations only; also asserts that color-contrast actually evaluated (passed) so a pass is not vacuous. */
export async function runAxe(page: Page): Promise<AxeViolation[]> {
  const s = await runAxeFull(page);
  expect(s.passed.length, "axe evaluated no rules").toBeGreaterThan(0);
  return s.violations;
}
