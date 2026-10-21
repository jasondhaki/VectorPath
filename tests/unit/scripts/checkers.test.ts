import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findViolations } from "@/scripts/check-tokens.mjs";
import { classifyLink, existsExact, headingSlugs, linkTargets, plannedPaths } from "@/scripts/check-docs.mjs";

describe("check-docs parsing", () => {
  it("reads angle-bracket and titled link targets", () => {
    expect(linkTargets('[a](<x y.md>) [b](z.md "t") [c](lib/db/)')).toEqual(["x y.md", "z.md", "lib/db/"]);
  });

  it("validates anchors against heading slugs", () => {
    const slugs = headingSlugs("# Title\n## 12. Owner decisions — free demo mode (2026-10-20)\n## Title\n");
    const anchorsOf = () => slugs;
    const exists = () => true;
    expect(classifyLink("a.md", "b.md#title-1", new Set(), exists, anchorsOf)).toBe("existing");
    expect(classifyLink("a.md", "b.md#12-owner-decisions--free-demo-mode-2026-10-20", new Set(), exists, anchorsOf)).toBe("existing");
    expect(classifyLink("a.md", "b.md#no-such-anchor", new Set(), exists, anchorsOf)).toBe("broken");
  });

  it("keeps underscores like GitHub and ignores fenced headings", () => {
    const slugs = headingSlugs("### 12.1 One model switch: GEMINI_TIER\n```md\n# not a heading\n```\n");
    expect(slugs.has("121-one-model-switch-gemini_tier")).toBe(true);
    expect(slugs.has("not-a-heading")).toBe(false);
  });

  it("checks file existence case-exactly", () => {
    expect(existsExact("CLAUDE.md")).toBe(true);
    expect(existsExact("claude.MD")).toBe(false);
  });
});

describe("check-tokens", () => {
  it("flags raw and default-palette colours, allows token classes", () => {
    expect(findViolations("a.tsx", 'className="bg-slate-800 text-[#fff]"')).toHaveLength(3);
    expect(findViolations("a.tsx", 'className="bg-background text-foreground"')).toEqual([]);
    expect(findViolations("a.tsx", "color: #FF8A3D")).toHaveLength(1);
  });

  // Frontend REQUEST (U02 handoff §5): gaps in the original rule set.
  const why = (line: string) => findViolations("a.tsx", line).map((p) => p.replace(/^a\.tsx:1 /, ""));

  it("flags named CSS colours and other literals in style props and SVG attributes", () => {
    for (const line of [
      '<p style={{ color: "red" }} />',
      "<p style={{ backgroundColor: 'rebeccapurple' }} />",
      '<p style={{ borderTopColor: "white" }} />',
      '<svg fill="black" />',
      '<path stroke="tomato" />',
      "<p style={{ outlineColor: `navy` }} />",
    ]) expect(why(line), line).toContain("literal colour in style prop");
  });

  it("allows token vars and colour keywords in style props", () => {
    for (const line of [
      '<p style={{ color: "var(--paper)" }} />',
      '<svg fill="currentColor" stroke="none" />',
      '<p style={{ background: "transparent", borderColor: "inherit" }} />',
      "const color: string = token;",
    ]) expect(findViolations("a.tsx", line), line).toEqual([]);
  });

  it("flags white/black and default palettes on every colour utility", () => {
    for (const cls of ["fill-white", "stroke-black", "outline-white", "ring-black", "accent-white", "caret-black", "decoration-white", "placeholder-black", "ring-offset-white", "border-t-black", "divide-white"]) {
      expect(why(`className="${cls}"`), cls).toContain("white/black class");
    }
    for (const cls of ["accent-red-500", "caret-sky-400", "decoration-rose-300", "placeholder-slate-500", "ring-offset-gray-900", "border-x-zinc-700"]) {
      expect(why(`className="${cls}"`), cls).toContain("default palette class");
    }
  });

  it("flags colour functions and named colours inside arbitrary brackets", () => {
    expect(why('className="shadow-[0_0_0_1px_rgb(0_0_0)]"')).toContain("raw colour function");
    expect(why('className="bg-[color:oklch(0.7_0.1_40)]"')).toContain("raw colour function");
    expect(why('className="bg-[linear-gradient(90deg,hsl(0_0%_0%),transparent)]"')).toContain("raw colour function");
    expect(why('className="text-[color-mix(in_srgb,var(--paper),black)]"')).toContain("raw colour function");
    for (const fn of ["hwb(", "lab(", "lch(", "oklab("]) expect(why(`className="bg-[${fn}1_2_3)]"`), fn).toContain("raw colour function");
    expect(why('className="bg-[red]"')).toContain("arbitrary colour value");
    expect(why('className="text-[color:White]"')).toContain("arbitrary colour value");
  });

  it("does not flag token classes, tech names or ordinary code", () => {
    for (const line of [
      'className="bg-card text-foreground-secondary border-line-strong fill-primary stroke-muted-foreground outline-ring ring-offset-background"',
      'className="w-[68ch] max-w-[calc(100%-2rem)] grid-cols-[4rem_minmax(0,1fr)]"',
      "const lab = getLab(x); const t = toColor(y);",
      "// The red line in ui-context is a comment about routes",
    ]) expect(findViolations("a.tsx", line), line).toEqual([]);
  });
});

describe("check-docs", () => {
  const planned = plannedPaths("[`lib/db/`](lib/db/) and [x](app/page.tsx)");
  const exists = (p: string) => p === "CLAUDE.md";
  it("distinguishes existing, planned, external and broken links", () => {
    expect(classifyLink("README.md", "CLAUDE.md", planned, exists)).toBe("existing");
    expect(classifyLink("README.md", "lib/db/", planned, exists)).toBe("planned");
    expect(classifyLink("docs/agents/board.md", "../../app/page.tsx", planned, exists)).toBe("planned");
    expect(classifyLink("README.md", "https://example.org", planned, exists)).toBe("external");
    expect(classifyLink("README.md", "nope.md", planned, exists)).toBe("broken");
  });
});

describe("require-test-db", () => {
  const script = fileURLToPath(new URL("../../../scripts/require-test-db.mjs", import.meta.url));
  // Run from an empty temp directory so no developer .env.local is read; secrets never enter the test.
  const run = (env: Record<string, string>, envLocal?: string) => {
    const cwd = mkdtempSync(join(tmpdir(), "vp-req-db-"));
    try {
      if (envLocal !== undefined) writeFileSync(join(cwd, ".env.local"), envLocal);
      const base = { ...process.env };
      delete base.TEST_DATABASE_URL;
      return spawnSync(process.execPath, [script], { cwd, env: { ...base, ...env }, encoding: "utf8" });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  };

  it("blocks clearly when TEST_DATABASE_URL is absent everywhere", () => {
    const r = run({});
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("BLOCKED: TEST_DATABASE_URL is not set");
  });

  it("accepts the variable from the environment or from .env.local, without printing it", () => {
    const url = "postgresql://u:p@127.0.0.1:1/x_test";
    const fromEnv = run({ TEST_DATABASE_URL: url });
    expect(fromEnv.status).toBe(0);
    const fromFile = run({}, `TEST_DATABASE_URL=${url}\n`);
    expect(fromFile.status).toBe(0);
    expect(fromFile.stdout + fromFile.stderr).not.toContain("u:p@");
  });
});
