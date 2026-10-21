import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// WCAG 2.x contrast computed from the actual values in app/globals.css (ui-context §2: record, don't quote).
const css = readFileSync("app/globals.css", "utf8");
const tokens = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]?.toLowerCase()]));

function hex(name: string): string {
  const value = tokens[name];
  if (!value) throw new Error(`token --${name} missing from globals.css`);
  return value;
}

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(hex(fg)), luminance(hex(bg))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const SURFACES = ["night-0", "night-1", "night-2", "night-3"];
const TEXT = ["paper", "paper-2", "paper-3", "signal", "have", "partial", "transfer", "build", "projected", "danger"];
const NON_TEXT = ["focus", "line-input", "signal", "route-1", "route-2", "route-3", "route-4", "route-5"];

describe("token contrast (WCAG AA)", () => {
  it("palette in globals.css matches the ui-context table", () => {
    const table = readFileSync("ui-context_astra.md", "utf8");
    const rows = [...table.matchAll(/^\|[^|]+\|\s*([a-z0-9-]+)\s*\|\s*(#[0-9A-F]{6})\s*\|\r?$/gm)];
    expect(rows).toHaveLength(21); // all single-value hex rows; scrim and route rows are multi-value
    for (const [, name, value] of rows) expect(hex(name ?? ""), name).toBe(value?.toLowerCase());
  });

  it.each(TEXT.flatMap((fg) => SURFACES.map((bg) => [fg, bg] as const)))("text %s on %s ≥ 4.5", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["paper", "paper-2", "paper-3", "signal"].map((fg) => [fg] as const))("text %s on signal-wash (selection) ≥ 4.5", (fg) => {
    expect(contrast(fg, "signal-wash")).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["signal", "signal-hover"].map((bg) => [bg] as const))("signal-ink on %s ≥ 4.5", (bg) => {
    expect(contrast("signal-ink", bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT.flatMap((fg) => SURFACES.map((bg) => [fg, bg] as const)))("non-text %s on %s ≥ 3", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  // Recorded restrictions: these pairs fail and must not be used for the stated purpose.
  it("documents failing pairs that components must avoid", () => {
    expect(contrast("danger", "signal-wash")).toBeLessThan(4.5); // no danger text on selection wash
    expect(contrast("line-2", "night-1")).toBeLessThan(3); // line-2 never the sole selection indicator
    expect(contrast("line-1", "night-1")).toBeLessThan(3); // line-1 is decorative only
  });
});
