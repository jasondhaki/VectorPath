import { describe, expect, it } from "vitest";
import {
  EMBEDDING_DIM, LOCAL_HASH_EMBEDDING_IDENTITY, REFERENCE_EMBEDDING_IDENTITY, assertIdentity, parseVector, toVectorParam,
} from "@/lib/db/vector";

describe("assertIdentity", () => {
  it("accepts the pinned reference identity for every vector column", () => {
    for (const t of ["skill", "occupation", "occupationTitle"] as const) expect(() => assertIdentity(t, REFERENCE_EMBEDDING_IDENTITY)).not.toThrow();
  });

  it("refuses the local-hash identity and any other identity", () => {
    expect(() => assertIdentity("skill", LOCAL_HASH_EMBEDDING_IDENTITY)).toThrow(/not allowed/);
    expect(() => assertIdentity("occupation", "gemini-embedding-001:3072:SEMANTIC_SIMILARITY:l2")).toThrow(/not allowed/);
    expect(() => assertIdentity("occupationTitle", "")).toThrow(/not allowed/);
  });

  it("matches the identity the migration CHECK constraints pin", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync(new URL("../../../prisma/migrations/20261021010000_review_fixes/migration.sql", import.meta.url), "utf8");
    expect(sql.match(new RegExp(`'${REFERENCE_EMBEDDING_IDENTITY}'`, "g"))).toHaveLength(3);
  });
});

// Boundary validation for vector parameters (architecture §5, I13); no database needed.
const ones = () => new Array<number>(EMBEDDING_DIM).fill(0.5);

describe("toVectorParam", () => {
  it("serializes a valid 768-d vector as a pgvector literal", () => {
    const text = toVectorParam(ones());
    expect(text.startsWith("[0.5,")).toBe(true);
    expect(text.split(",")).toHaveLength(EMBEDDING_DIM);
  });

  it.each([
    ["too short", new Array<number>(767).fill(1)],
    ["too long", new Array<number>(769).fill(1)],
    ["empty", []],
  ])("rejects %s vectors", (_label, v) => {
    expect(() => toVectorParam(v)).toThrow(/768 dimensions/);
  });

  it.each([NaN, Infinity, -Infinity])("rejects non-finite value %s", (bad) => {
    const v = ones();
    v[5] = bad;
    expect(() => toVectorParam(v)).toThrow(/non-finite/);
  });

  it("rejects the zero vector", () => {
    expect(() => toVectorParam(new Array<number>(EMBEDDING_DIM).fill(0))).toThrow(/zero norm/);
  });
});

describe("parseVector", () => {
  it("round-trips the serialized form", () => {
    const v = ones();
    v[0] = -0.25;
    expect(parseVector(toVectorParam(v))).toEqual(v);
  });

  it("rejects malformed or wrong-dimension text", () => {
    expect(() => parseVector("1,2,3")).toThrow(/Malformed/);
    expect(() => parseVector("[1,2,3]")).toThrow(/768/);
  });
});
