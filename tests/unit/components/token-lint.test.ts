import { describe, expect, it } from "vitest";
import { findViolations } from "@/scripts/check-tokens.mjs";

// Whole-tree enforcement runs in `npm run lint` (node scripts/check-tokens.mjs).
describe("token lint over components/", () => {
  it("rejects raw colours in a component file", () => {
    const bad = [
      'export const A = () => <div className="bg-[#ff8a3d] text-slate-400" />;',
      'export const B = () => <p style={{ color: "#FFFFFF" }} className="border-white" />;',
      'export const C = () => <span style={{ background: "rgb(0 0 0)" }} />;',
    ].join("\n");
    const problems = findViolations("components/shared/bad.tsx", bad);
    expect(problems).toEqual(
      expect.arrayContaining([
        "components/shared/bad.tsx:1 raw hex colour",
        "components/shared/bad.tsx:1 default palette class",
        "components/shared/bad.tsx:1 arbitrary colour value",
        "components/shared/bad.tsx:2 raw hex colour",
        "components/shared/bad.tsx:2 white/black class",
        "components/shared/bad.tsx:3 raw colour function",
      ]),
    );
  });

  it("accepts the semantic token classes this unit introduces", () => {
    const good = 'className="bg-card bg-raised bg-selection text-foreground-secondary border-input border-line-strong text-have text-build bg-chart-1 ring-ring"';
    expect(findViolations("components/shared/good.tsx", good)).toEqual([]);
  });
});
