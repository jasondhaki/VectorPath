import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { audit, parseNameStatusZ, parsePorcelainZ } from "@/scripts/agents/check-ownership.mjs";
import { canWrite, loadOwnership, resolveOwner, roleFromHook, validateOwnership } from "@/scripts/agents/ownership-lib.mjs";
import { decide } from "@/.claude/hooks/guard-commands.mjs";

const root = resolve(".");
const config = loadOwnership(root);
const NOW = "2026-10-20T00:00:00.000Z";

describe("ownership resolver (probes 1, 2, 4, 6)", () => {
  it("denies frontend writing domain and allows its own component", () => {
    expect(canWrite(config, root, "frontend", "lib/domain/scoring/fit.ts", NOW).ok).toBe(false);
    expect(canWrite(config, root, "frontend", "components/skills/skill-chip.tsx", NOW).ok).toBe(true);
  });

  it("gives every planned top-level area exactly one owner, with specific rules winning", () => {
    const owner = (p: string) => resolveOwner(config, p, NOW, "linux").owner;
    expect(owner("app/p/[profileId]/skills/page.tsx")).toBe("frontend");
    expect(owner("app/p/[profileId]/skills/actions.ts")).toBe("backend");
    expect(owner("app/api/health/route.ts")).toBe("backend");
    expect(owner("components/ui/button.tsx")).toBe("lead");
    expect(owner("scripts/seed-onet.ts")).toBe("data");
    expect(owner("docs/agents/handoffs/domain-U14.md")).toBe("domain");
    expect(resolveOwner(config, "random/file.ts", NOW, "linux").error).toMatch(/no owner/);
  });

  it("denies unknown roles, outside-root paths and traversal", () => {
    expect(canWrite(config, root, "intern", "components/x.tsx", NOW).ok).toBe(false);
    expect(canWrite(config, root, "lead", "C:/Windows/system32/x.dll", NOW).ok).toBe(false);
    expect(canWrite(config, root, "frontend", "components/../../outside.ts", NOW).ok).toBe(false);
  });

  it("treats non-vp subagents as unknown and only an absent identity as lead", () => {
    expect(roleFromHook({})).toBe("lead");
    expect(roleFromHook({ agent_type: "vp-domain" })).toBe("domain");
    expect(roleFromHook({ agent_type: "general-purpose" })).toBe("unknown:general-purpose");
    for (const agent_type of ["", "x:", 42, "vp-", "vp-xyz", "someplugin:vp-lead", null]) {
      expect(roleFromHook({ agent_type })).toMatch(/^unknown:/);
    }
  });

  it.runIf(process.platform === "win32")("rejects NTFS stream and trailing-dot aliases", () => {
    expect(canWrite(config, root, "frontend", "app/x/actions.ts::$DATA", NOW).ok).toBe(false);
    expect(canWrite(config, root, "frontend", "app/x/page.tsx:stream", NOW).ok).toBe(false);
    expect(canWrite(config, root, "frontend", "app/x/actions.ts.", NOW).ok).toBe(false);
  });

  it("lets a grant authorize only named files, pause the owner and expire", () => {
    const granted = { ...config, grants: [{ role: "debugger", bug: "BUG-1", paths: ["lib/domain/scoring/fit.ts"], expires: "2026-10-21T00:00:00.000Z" }] };
    expect(canWrite(granted, root, "debugger", "lib/domain/scoring/fit.ts", NOW).ok).toBe(true);
    expect(canWrite(granted, root, "domain", "lib/domain/scoring/fit.ts", NOW).ok).toBe(false);
    expect(canWrite(granted, root, "debugger", "lib/domain/scoring/reach.ts", NOW).ok).toBe(false);
    expect(canWrite(granted, root, "domain", "lib/domain/scoring/fit.ts", "2026-10-22T00:00:00.000Z").ok).toBe(true);
  });

  it("rejects malformed ownership files and never honors an unparseable expiry", () => {
    const bad = (grant: { expires: string; role?: string }) => ({
      ...config,
      grants: [{ role: "debugger", bug: "B", paths: ["lib/domain/x.ts"], ...grant }],
    });
    expect(() => validateOwnership(bad({ expires: "never" }))).toThrow(/expiry/);
    expect(() => validateOwnership(bad({ expires: "9999" }))).toThrow(/expiry/);
    expect(() => validateOwnership(bad({ expires: "2026-10-21" }))).toThrow(/expiry/);
    expect(() => validateOwnership(bad({ expires: "2026-10-21T00:00:00+06:00" }))).not.toThrow();
    expect(() => validateOwnership(bad({ expires: "2026-10-21T00:00:00Z", role: "root" }))).toThrow(/grant/);
    expect(() => validateOwnership({ ...config, rules: [{ owner: "lead", paths: [] }] })).toThrow(/rule/);
    // Bypassing validation, a bad expiry is treated as expired: the original owner keeps the file.
    expect(resolveOwner(bad({ expires: "never" }), "lib/domain/x.ts", NOW).owner).toBe("domain");
    // Real date comparison: an offset expiry string still compares by instant.
    expect(resolveOwner(bad({ expires: "2026-10-20T05:00:00+06:00" }), "lib/domain/x.ts", NOW).owner).toBe("domain");
  });

  it("treats ? in globs literally", () => {
    const q = { ...config, grants: [{ role: "debugger", bug: "B", paths: ["lib/domain/a?.ts"], expires: "2027-01-01T00:00:00Z" }] };
    expect(resolveOwner(q, "lib/domain/ab.ts", NOW).owner).toBe("domain");
  });

  it.runIf(process.platform === "win32")("folds case and backslashes on Windows", () => {
    expect(canWrite(config, root, "domain", "LIB\\Domain\\Scoring\\fit.ts", NOW).ok).toBe(true);
  });
});

describe("command guard (probe 3)", () => {
  it("blocks frontend installs/migrations and reviewer writes; asks for destructive ops", () => {
    expect(decide("frontend", "npm install left-pad")?.[0]).toBe("deny");
    expect(decide("frontend", "npx prisma migrate dev")?.[0]).toBe("deny");
    expect(decide("frontend", "npx prisma db push")?.[0]).toBe("deny");
    expect(decide("backend", "npx prisma migrate dev")).toBeNull();
    expect(decide("reviewer", "echo x > lib/domain/a.ts")?.[0]).toBe("deny");
    expect(decide("lead", "npx prisma migrate reset")?.[0]).toBe("ask");
    expect(decide("lead", "npm run typecheck")).toBeNull();
  });
});

describe("diff audit (probe 5)", () => {
  it("parses renames, deletions, staged and untracked entries", () => {
    const porcelain = parsePorcelainZ("R  lib/domain/b.ts\0lib/domain/a.ts\0 D lib/domain/c.ts\0M  app/page.tsx\0?? lib/domain/new.ts\0");
    expect(porcelain).toEqual([
      { status: "R ", path: "lib/domain/b.ts", from: "lib/domain/a.ts" },
      { status: " D", path: "lib/domain/c.ts" },
      { status: "M ", path: "app/page.tsx" },
      { status: "??", path: "lib/domain/new.ts" },
    ]);
    expect(parseNameStatusZ("R100\0a.ts\0b.ts\0D\0c.ts\0")).toEqual([
      { status: "R100", from: "a.ts", path: "b.ts" },
      { status: "D", path: "c.ts" },
    ]);
  });

  it("flags undeclared additions and other-role paths", () => {
    const changes = parsePorcelainZ("?? lib/domain/new.ts\0M  app/page.tsx\0");
    const declared = new Set(["lib/domain/new.ts"]);
    const { problems } = audit(changes, config, root, { role: "domain", declared });
    expect(problems).toEqual(expect.arrayContaining(["app/page.tsx owned by frontend, not domain", "undeclared change: app/page.tsx"]));
    expect(problems.some((p) => p.includes("new.ts"))).toBe(false);
  });
});
