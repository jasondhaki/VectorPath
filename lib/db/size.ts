import "server-only";
import type { Db } from "./client";

// Measured storage report for npm run db:size (architecture §12.4: seeded vectors + indexes ≤150 MB).

export const SIZE_BUDGET_BYTES = 150 * 1024 * 1024;

export type RelationSize = { name: string; tableBytes: number; indexBytes: number; totalBytes: number };
export type SizeReport = {
  database: string;
  databaseBytes: number;
  extensions: { name: string; version: string }[];
  relations: RelationSize[];
  vectorIndexBytes: number;
};

export async function measureSize(db: Db): Promise<SizeReport> {
  const [dbRow] = await db.$queryRaw<{ name: string; bytes: bigint }[]>`
    SELECT current_database() AS name, pg_database_size(current_database()) AS bytes`;
  if (!dbRow) throw new Error("Could not read database size.");
  const extensions = await db.$queryRaw<{ name: string; version: string }[]>`
    SELECT extname AS name, extversion AS version FROM pg_extension ORDER BY extname`;
  const relations = await db.$queryRaw<{ name: string; table_bytes: bigint; index_bytes: bigint; total_bytes: bigint }[]>`
    SELECT c.relname AS name, pg_table_size(c.oid) AS table_bytes, pg_indexes_size(c.oid) AS index_bytes,
           pg_total_relation_size(c.oid) AS total_bytes
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC, c.relname`;
  const [vectorRow] = await db.$queryRaw<{ bytes: bigint | null }[]>`
    SELECT sum(pg_relation_size(i.indexrelid)) AS bytes
    FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid JOIN pg_am am ON am.oid = ic.relam
    WHERE am.amname IN ('hnsw', 'ivfflat')`;
  return {
    database: dbRow.name,
    databaseBytes: Number(dbRow.bytes),
    extensions,
    relations: relations.map((r) => ({ name: r.name, tableBytes: Number(r.table_bytes), indexBytes: Number(r.index_bytes), totalBytes: Number(r.total_bytes) })),
    vectorIndexBytes: Number(vectorRow?.bytes ?? 0),
  };
}
