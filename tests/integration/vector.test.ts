import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import { createDb } from "@/lib/db/client";
import {
  EMBEDDING_DIM, LOCAL_HASH_EMBEDDING_IDENTITY as LOCAL, REFERENCE_EMBEDDING_IDENTITY as REF, getEmbedding, nearest, setEmbedding,
} from "@/lib/db/vector";
import { SETUP_TIMEOUT_MS, setupTestDb } from "../setup/integration-db";

// Vector round trip, nearest lookup, extensions and hand-written indexes (U03 acceptance).
let db: Db;
beforeAll(async () => {
  db = await setupTestDb();
}, SETUP_TIMEOUT_MS);
afterAll(async () => {
  await db?.$disconnect();
});

/** Unit vector along axis `i`, optionally tilted toward axis `j` (values exactly representable in float32). */
function axis(i: number, j?: number, tilt = 0.25): number[] {
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  v[i] = 1;
  if (j !== undefined) v[j] = tilt;
  return v;
}

async function skill(id: string) {
  await db.skill.create({ data: { id, name: id, kind: "software", source: "synthetic-test", sourceVersion: "t1" } });
}

describe("database extensions and indexes", () => {
  it("has vector and pg_trgm installed", async () => {
    const rows = await db.$queryRaw<{ extname: string }[]>`SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pg_trgm') ORDER BY extname`;
    expect(rows.map((r) => r.extname)).toEqual(["pg_trgm", "vector"]);
  });

  it("keeps the HNSW and trigram indexes Prisma cannot model (a later migrate diff must not drop them)", async () => {
    const rows = await db.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND (indexname LIKE '%hnsw_idx' OR indexname LIKE '%trgm_idx') ORDER BY indexname`;
    expect(rows.map((r) => r.indexname)).toEqual([
      "OccupationTitle_embedding_hnsw_idx",
      "OccupationTitle_normalized_trgm_idx",
      "Occupation_embedding_hnsw_idx",
      "SkillAlias_normalized_trgm_idx",
      "Skill_embedding_hnsw_idx",
    ]);
  });

  it("answers trigram similarity lookups for typo candidates", async () => {
    await skill("synthetic:python");
    await db.skillAlias.create({ data: { skillId: "synthetic:python", alias: "Python", normalized: "python", source: "synthetic-test", provenance: {} } });
    const rows = await db.$queryRaw<{ skillId: string }[]>`
      SELECT "skillId" FROM "SkillAlias" WHERE "normalized" % ${"pythn"} ORDER BY similarity("normalized", ${"pythn"}) DESC LIMIT 5`;
    expect(rows.map((r) => r.skillId)).toContain("synthetic:python");
  });
});

describe("lib/db/vector", () => {
  it("round-trips a 768-d vector exactly and records its identity", async () => {
    await skill("synthetic:a");
    const v = axis(3, 7);
    v[100] = -0.5;
    expect(await setEmbedding(db, "skill", "synthetic:a", REF, v)).toBe(true);
    expect(await getEmbedding(db, "skill", "synthetic:a", REF)).toEqual(v);
    const row = await db.skill.findUniqueOrThrow({ where: { id: "synthetic:a" }, select: { embeddingIdentity: true } });
    expect(row.embeddingIdentity).toBe(REF);
  });

  it("returns null for an unembedded row and false for a missing key", async () => {
    await skill("synthetic:empty");
    expect(await getEmbedding(db, "skill", "synthetic:empty", REF)).toBeNull();
    expect(await setEmbedding(db, "skill", "synthetic:missing", REF, axis(0))).toBe(false);
  });

  it("orders nearest neighbours by cosine distance and bounds the result count", async () => {
    await skill("synthetic:n0");
    await skill("synthetic:n1");
    await skill("synthetic:n2");
    await setEmbedding(db, "skill", "synthetic:n0", REF, axis(10));
    await setEmbedding(db, "skill", "synthetic:n1", REF, axis(10, 11, 1)); // 45° from axis 10
    await setEmbedding(db, "skill", "synthetic:n2", REF, axis(11));
    const hits = await nearest(db, "skill", REF, axis(10, 11, 0.1), 2);
    expect(hits.map((h) => h.id)).toEqual(["synthetic:n0", "synthetic:n1"]);
    expect(hits[0]?.similarity).toBeGreaterThan(hits[1]?.similarity ?? 1);
    expect(hits[0]?.similarity).toBeLessThanOrEqual(1);
  });

  it("works for occupations (text key) and titles (uuid key)", async () => {
    await db.occupation.create({
      data: { code: "onet:00-0000.00", title: "Synthetic", description: "test", majorGroup: "00", minorGroup: "00-0", sourceVersion: "t1" },
    });
    const title = await db.occupationTitle.create({
      data: { occupationCode: "onet:00-0000.00", title: "Synthetic", normalized: "synthetic", kind: "primary", sourceVersion: "t1" },
    });
    await setEmbedding(db, "occupation", "onet:00-0000.00", REF, axis(20));
    await setEmbedding(db, "occupationTitle", title.id, REF, axis(21));
    expect((await nearest(db, "occupation", REF, axis(20), 1))[0]?.id).toBe("onet:00-0000.00");
    expect((await nearest(db, "occupationTitle", REF, axis(21), 1))[0]?.id).toBe(title.id);
  });

  it("rejects invalid vectors and limits before reaching SQL", async () => {
    await expect(setEmbedding(db, "skill", "synthetic:a", REF, axis(0).slice(1))).rejects.toThrow(/768 dimensions/);
    await expect(nearest(db, "skill", REF, axis(0), 0)).rejects.toThrow(/limit/);
    await expect(nearest(db, "skill", REF, axis(0), 101)).rejects.toThrow(/limit/);
  });

  it("refuses a wrong-dimension vector at the column level too", async () => {
    await expect(db.$executeRaw`UPDATE "Skill" SET "embedding" = ${"[1,2,3]"}::vector, "embeddingIdentity" = ${REF} WHERE "id" = ${"synthetic:a"}`)
      .rejects.toThrow(/expected 768 dimensions/);
  });
});

// U03 review #2 (I13): local-hash-ngram-v1 vectors never enter, or get compared with, gemini-embedding-001 columns.
describe("embedding identity", () => {
  it("refuses to write or match a local-hash vector against a reference column", async () => {
    await skill("synthetic:id");
    await setEmbedding(db, "skill", "synthetic:id", REF, axis(30));
    await expect(setEmbedding(db, "skill", "synthetic:id", LOCAL, axis(30))).rejects.toThrow(/not allowed for skill/);
    await expect(nearest(db, "skill", LOCAL, axis(30), 5)).rejects.toThrow(/not allowed for skill/);
    await expect(getEmbedding(db, "skill", "synthetic:id", LOCAL)).rejects.toThrow(/not allowed for skill/);
    await expect(setEmbedding(db, "occupation", "onet:00-0000.00", "gemini-embedding-001:3072:RETRIEVAL_QUERY:l2", axis(1))).rejects.toThrow(/not allowed/);
    expect(await getEmbedding(db, "skill", "synthetic:id", REF)).toEqual(axis(30));
  });

  it("the database rejects a foreign identity or a vector without an identity, even through raw SQL", async () => {
    const v = `[${axis(31).join(",")}]`;
    await expect(db.$executeRaw`UPDATE "Skill" SET "embedding" = ${v}::vector, "embeddingIdentity" = ${LOCAL} WHERE "id" = ${"synthetic:id"}`)
      .rejects.toThrow(/Skill_embeddingIdentity_check/);
    await expect(db.$executeRaw`UPDATE "Skill" SET "embeddingIdentity" = NULL WHERE "id" = ${"synthetic:id"}`).rejects.toThrow(/Skill_embeddingIdentity_check/);
    await expect(db.$executeRaw`UPDATE "Occupation" SET "embedding" = ${v}::vector, "embeddingIdentity" = NULL WHERE "code" = ${"onet:00-0000.00"}`)
      .rejects.toThrow(/Occupation_embeddingIdentity_check/);
    await expect(db.$executeRaw`UPDATE "OccupationTitle" SET "embeddingIdentity" = ${REF} WHERE "embedding" IS NULL`).resolves.toBe(0);
  });
});

// U03 review #4: an HNSW scan returns at most hnsw.ef_search rows (default 40); nearest must return the full limit.
describe("nearest through the HNSW index", () => {
  it("returns the full limit of 100 when the planner uses the index", async () => {
    for (let i = 0; i < 100; i += 1) {
      await skill(`synthetic:h${i}`);
      await setEmbedding(db, "skill", `synthetic:h${i}`, REF, axis(100 + i, 100 + ((i + 1) % 100), 0.5));
    }
    const url = new URL(process.env.TEST_DATABASE_URL ?? "");
    url.searchParams.set("options", "-c enable_seqscan=off");
    const indexed = createDb(url.toString()); // same guarded test DB; seq scans disabled to force the index path
    try {
      const q = `[${axis(100).join(",")}]`;
      const plan = await indexed.$queryRaw<{ "QUERY PLAN": string }[]>`
        EXPLAIN SELECT id FROM "Skill" WHERE "embedding" IS NOT NULL AND "embeddingIdentity" = ${REF} ORDER BY "embedding" <=> ${q}::vector LIMIT 100`;
      expect(plan.map((r) => r["QUERY PLAN"]).join(" ")).toContain("Skill_embedding_hnsw_idx");
      const bare = await indexed.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Skill" WHERE "embedding" IS NOT NULL ORDER BY "embedding" <=> ${q}::vector LIMIT 100`;
      expect(bare.length).toBeLessThanOrEqual(40); // the default ef_search ceiling the fix addresses
      const hits = await nearest(indexed, "skill", REF, axis(100), 100);
      expect(hits).toHaveLength(100);
      expect(hits[0]?.id).toBe("synthetic:h0");
    } finally {
      await indexed.$disconnect();
    }
  }, 60_000);
});
