import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// U03 review #12: Prisma cannot model the hand-written HNSW/trigram/partial indexes and its diff proposes dropping
// them. This static check fails before such a migration is ever applied (rule: create with --create-only, strip drops).
const MIGRATIONS = fileURLToPath(new URL("../../../prisma/migrations/", import.meta.url));
const PROTECTED_DROP = /DROP\s+INDEX\s+(IF\s+EXISTS\s+)?"?[A-Za-z0-9_]*_(hnsw|trgm|partial)_idx"?/i;

/** Returns protected index drops in a migration's SQL, ignoring comment lines. */
export function protectedDrops(sql: string): string[] {
  return sql.split("\n").filter((line) => !line.trimStart().startsWith("--") && PROTECTED_DROP.test(line));
}

describe("migration files", () => {
  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();

  it("exist", () => {
    expect(dirs.length).toBeGreaterThanOrEqual(2);
  });

  it.each(dirs)("%s never drops a hand-written *_hnsw_idx / *_trgm_idx / *_partial_idx index", (dir) => {
    expect(protectedDrops(readFileSync(`${MIGRATIONS}${dir}/migration.sql`, "utf8"))).toEqual([]);
  });

  it("the detector catches the drops Prisma generates and ignores comments", () => {
    expect(protectedDrops('DROP INDEX "Skill_embedding_hnsw_idx";')).toHaveLength(1);
    expect(protectedDrops("drop index if exists SkillAlias_normalized_trgm_idx;")).toHaveLength(1);
    expect(protectedDrops('DROP INDEX "LlmCache_general_key_partial_idx";')).toHaveLength(1);
    expect(protectedDrops('-- DROP INDEX "Skill_embedding_hnsw_idx";\nDROP INDEX "LlmCache_key_key";')).toEqual([]);
  });
});
