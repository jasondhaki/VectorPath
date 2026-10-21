import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { getEnv } from "@/lib/config/env";
import { PrismaClient } from "./generated/client";

// The only Prisma client boundary (code-standards §3). Services call query modules in lib/db/, never this client directly.

export type Db = InstanceType<typeof PrismaClient>;

/** Creates a client for an explicit connection string (runtime pooled URL, scripts or the guarded test database). */
export function createDb(connectionString: string): Db {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const globalForDb = globalThis as typeof globalThis & { vectorpathDb?: Db };

/** Lazily created runtime client; one instance per process (survives dev hot reload). Fails clearly when unconfigured. */
export function getDb(): Db {
  if (globalForDb.vectorpathDb) return globalForDb.vectorpathDb;
  const url = getEnv().DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set; start the local database (docker compose up -d db) and configure .env.local.");
  globalForDb.vectorpathDb = createDb(url);
  return globalForDb.vectorpathDb;
}
