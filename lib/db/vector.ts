import "server-only";
import type { Db } from "./client";
import { Prisma } from "./generated/client";

// The only module that reads or writes vector columns (architecture §5, §12.3, I13).
// Every row stores its embedding identity next to the vector (CHECK-pinned in migration SQL); writes and
// comparisons require the caller to name the identity, so local-hash-ngram-v1 vectors can never be written
// into, or compared against, the gemini-embedding-001 reference columns.
// Vectors are always bound as parameters; table/column identifiers come from the constant map below only.

export const EMBEDDING_DIM = 768;
export const MAX_NEAREST = 100;
/** pgvector's HNSW scan returns at most hnsw.ef_search rows (default 40); nearest raises it to ≥ limit. */
const MIN_EF_SEARCH = 40;

/** The only identity the reference columns accept; must match the migration CHECK constraints. */
export const REFERENCE_EMBEDDING_IDENTITY = "gemini-embedding-001:768:SEMANTIC_SIMILARITY:l2";
/** Offline lexical fallback (architecture §12.3). A separate identity: it has no column here yet. */
export const LOCAL_HASH_EMBEDDING_IDENTITY = "local-hash-ngram-v1:768:l2";

const TARGETS = {
  skill: { table: Prisma.raw('"Skill"'), key: Prisma.raw('"id"'), keyCast: Prisma.raw("text") },
  occupation: { table: Prisma.raw('"Occupation"'), key: Prisma.raw('"code"'), keyCast: Prisma.raw("text") },
  occupationTitle: { table: Prisma.raw('"OccupationTitle"'), key: Prisma.raw('"id"'), keyCast: Prisma.raw("uuid") },
} as const;

/** Identities each target column may hold. Adding one requires a migration and a separate column/index, never mixing. */
const ALLOWED_IDENTITIES: Record<VectorTarget, readonly string[]> = {
  skill: [REFERENCE_EMBEDDING_IDENTITY],
  occupation: [REFERENCE_EMBEDDING_IDENTITY],
  occupationTitle: [REFERENCE_EMBEDDING_IDENTITY],
};

export type VectorTarget = keyof typeof TARGETS;
export type Neighbor = { id: string; similarity: number };

/** Throws unless `identity` is one the target column stores. */
export function assertIdentity(target: VectorTarget, identity: string): void {
  if (!ALLOWED_IDENTITIES[target].includes(identity)) {
    throw new Error(`Embedding identity "${identity}" is not allowed for ${target}; vectors of different identities are never mixed.`);
  }
}

/** Validates a reference vector (exact dimension, finite values, nonzero norm) and serializes it as a pgvector parameter. */
export function toVectorParam(values: readonly number[]): string {
  if (values.length !== EMBEDDING_DIM) throw new Error(`Vector must have ${EMBEDDING_DIM} dimensions, got ${values.length}.`);
  let norm = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error("Vector contains a non-finite value.");
    norm += v * v;
  }
  if (norm === 0) throw new Error("Vector has zero norm.");
  return `[${values.join(",")}]`;
}

/** Parses pgvector's text form ("[1,2,3]") back to numbers, validating the dimension. */
export function parseVector(text: string): number[] {
  if (!/^\[.*\]$/.test(text)) throw new Error("Malformed vector text.");
  const values = text.slice(1, -1).split(",").map(Number);
  toVectorParam(values);
  return values;
}

/** Stores a vector with its identity; returns false when no row has that key. */
export async function setEmbedding(db: Db, target: VectorTarget, key: string, identity: string, values: readonly number[]): Promise<boolean> {
  assertIdentity(target, identity);
  const t = TARGETS[target];
  const updated = await db.$executeRaw`
    UPDATE ${t.table} SET "embedding" = ${toVectorParam(values)}::vector, "embeddingIdentity" = ${identity}
    WHERE ${t.key} = ${key}::${t.keyCast}`;
  return updated === 1;
}

/** Reads a stored vector of the given identity; null when missing, not embedded or of another identity. */
export async function getEmbedding(db: Db, target: VectorTarget, key: string, identity: string): Promise<number[] | null> {
  assertIdentity(target, identity);
  const t = TARGETS[target];
  const rows = await db.$queryRaw<{ embedding: string | null }[]>`
    SELECT "embedding"::text AS embedding FROM ${t.table} WHERE ${t.key} = ${key}::${t.keyCast} AND "embeddingIdentity" = ${identity}`;
  const text = rows[0]?.embedding;
  return text ? parseVector(text) : null;
}

/**
 * Cosine nearest neighbours among rows of the same identity, ordered by the indexed distance expression;
 * similarity = 1 − cosine distance. Runs in a transaction that raises hnsw.ef_search to ≥ limit and enables
 * strict iterative scans so the identity filter cannot silently shorten the result.
 */
export async function nearest(db: Db, target: VectorTarget, identity: string, values: readonly number[], limit: number): Promise<Neighbor[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_NEAREST) throw new Error(`limit must be an integer in 1..${MAX_NEAREST}.`);
  assertIdentity(target, identity);
  const t = TARGETS[target];
  const vector = toVectorParam(values);
  const efSearch = String(Math.max(MIN_EF_SEARCH, limit));
  const rows = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('hnsw.ef_search', ${efSearch}, true), set_config('hnsw.iterative_scan', 'strict_order', true)`;
    return tx.$queryRaw<{ id: string; similarity: number }[]>`
      SELECT ${t.key}::text AS id, 1 - ("embedding" <=> ${vector}::vector) AS similarity
      FROM ${t.table}
      WHERE "embedding" IS NOT NULL AND "embeddingIdentity" = ${identity}
      ORDER BY "embedding" <=> ${vector}::vector
      LIMIT ${limit}`;
  });
  return rows.map((r) => ({ id: r.id, similarity: Number(r.similarity) }));
}
