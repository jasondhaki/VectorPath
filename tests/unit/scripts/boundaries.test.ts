import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

const eslint = new ESLint();
// ESLint's first lintText loads config and plugins (10–17 s on a cold Windows cache); pay it once outside the cases.
beforeAll(() => eslint.lintText("", { filePath: "lib/domain/warmup.ts" }), 60_000);
const ruleIds = async (code: string, filePath: string) =>
  (await eslint.lintText(code, { filePath }))[0]?.messages.map((m) => m.ruleId) ?? [];
const blocked = async (code: string, filePath: string) => {
  const ids = await ruleIds(code, filePath);
  return ids.some((id) => id?.startsWith("no-restricted-"));
};

describe("lint boundaries", () => {
  it.each([
    ['import "@/lib/db/client";', "lib/domain/scoring/fit.ts"],
    ['import "../../db/client";', "lib/domain/scoring/fit.ts"],
    ['import "./../db/client";', "lib/domain/a.ts"],
    ['import "@/lib/./db/client";', "lib/domain/a.ts"],
    ['import "@/./lib/db/client";', "lib/domain/a.ts"],
    ['export * from "@/lib/db/client";', "lib/domain/a.ts"],
    ['import "@/components/x";', "lib/domain/a.ts"],
    ['import "undici";', "lib/domain/a.ts"],
    ['import "node:perf_hooks";', "lib/domain/a.ts"],
    ['import "@google/genai";', "lib/domain/a.ts"],
    ['import "pg";', "components/x.tsx"],
    ['import "pg";', "lib/services/a.ts"],
    ['import "@prisma/client";', "lib/services/x.ts"],
    ['import "../db/client.js";', "lib/services/a.ts"],
    ['import "@/lib/config/env.js";', "components/x.tsx"],
    ['import "@/lib/services/match";', "components/x/y.tsx"],
    ['import "@prisma/client";', "scripts/seed-x.ts"],
  ])("rejects %s in %s", async (code, file) => {
    expect(await blocked(`${code}\n`, file)).toBe(true);
  });

  it.each([
    ['export const p = import("@prisma/client");', "components/x.tsx"],
    ['export const p = import("ai");', "lib/services/x.ts"],
    ['export const p = import("@/lib/db/client");', "app/page.tsx"],
    ["export const p = (s: string) => import(s);", "lib/services/x.ts"],
  ])("rejects dynamic %s in %s", async (code, file) => {
    expect(await blocked(`${code}\n`, file)).toBe(true);
  });

  it.each([
    "export const a = Date.now();",
    "export const a = Math.random();",
    "export const a = Date();",
    "export const a = new Date();",
    "export const a = globalThis.fetch;",
    "export const a = performance.now();",
    "export const a = crypto.randomUUID();",
    "export const a = process.env;",
    "export const a = fetch;",
  ])("keeps domain pure: rejects %s", async (code) => {
    expect(await blocked(`${code}\n`, "lib/domain/x.ts")).toBe(true);
  });

  it.each([
    ["export const a = fetch;", "lib/services/x.ts"],
    ["export const a = fetch;", "lib/retrieval/x.ts"],
    ['export const a = globalThis.fetch("x");', "lib/services/x.ts"],
    ["export const a = self.fetch;", "lib/db/x.ts"],
  ])("rejects global fetch outside integrations: %s in %s", async (code, file) => {
    expect(await blocked(`${code}\n`, file)).toBe(true);
  });

  it.each([
    ['import "@prisma/client";', "lib/db/x.ts"],
    ['import "pg";', "lib/db/x.ts"],
    ['import "ai";', "lib/llm/x.ts"],
    ['import { z } from "zod";\nexport const s = z.string();', "lib/domain/x.ts"],
    ['import { score } from "./fit";\nexport const s = score;', "lib/domain/scoring/x.ts"],
    ['export const d = new Date("2026-01-01");', "lib/domain/x.ts"],
    ['export const p = import("@/components/graph");', "app/page.tsx"],
  ])("allows %s in %s", async (code, file) => {
    expect(await blocked(`${code}\n`, file)).toBe(false);
  });
});
