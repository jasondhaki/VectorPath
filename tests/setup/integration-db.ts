// Isolated test-database harness (U03, review R3-10 and U03 #1/#3). Destructive setup runs only after the
// target is verifiably the isolated test database: loopback host, `_test` database name, no connection
// query parameters beyond a small allowlist (pg-connection-string lets ?host=/?port=/?hostaddr=/?dbname=
// override the URL), distinct from DATABASE_URL/DIRECT_URL — then current_database() is re-checked on the
// server before migrations and again before truncation.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createDb, type Db } from "@/lib/db/client";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);
const TEST_DB_NAME = /^[a-z0-9_]+_test$/;
/** Query parameters that cannot redirect the connection. Anything else (host, hostaddr, port, dbname, service, options, …) is refused. */
const ALLOWED_PARAMS = new Set(["schema", "sslmode", "connect_timeout"]);

type Target = { host: string; port: string; database: string };

function parseUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("REFUSED: database URL is not a valid URL.");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") throw new Error("REFUSED: database URL must be a postgresql:// URL.");
  return parsed;
}

const label = (host: string) => {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  return LOOPBACK.has(h) ? "loopback" : h;
};

/** The target pg actually connects to: host/port/dbname query parameters win over the URL parts, as in pg-connection-string. */
function effectiveTarget(parsed: URL): Target {
  const q = parsed.searchParams;
  return {
    host: label(q.get("host") ?? q.get("hostaddr") ?? parsed.hostname),
    port: q.get("port") ?? (parsed.port || "5432"),
    database: q.get("dbname") ?? decodeURIComponent(parsed.pathname.slice(1)),
  };
}

/**
 * Throws unless `testUrl` points at a loopback database whose name ends in `_test`, carries only allowlisted
 * query parameters and is not the effective target of any configured non-test URL. Messages never include
 * URLs or credentials.
 */
export function assertIsolatedTestTarget(testUrl: string | undefined, otherUrls: readonly (string | undefined)[]): string {
  if (!testUrl) throw new Error("REFUSED: TEST_DATABASE_URL is not set.");
  const parsed = parseUrl(testUrl);
  for (const name of parsed.searchParams.keys()) {
    if (!ALLOWED_PARAMS.has(name.toLowerCase())) throw new Error(`REFUSED: TEST_DATABASE_URL query parameter "${name}" is not allowed (allowed: ${[...ALLOWED_PARAMS].join(", ")}).`);
  }
  const t = effectiveTarget(parsed);
  if (t.host !== "loopback") throw new Error("REFUSED: test database host must be loopback (localhost/127.0.0.1/::1).");
  if (!TEST_DB_NAME.test(t.database)) throw new Error("REFUSED: test database name must match /^[a-z0-9_]+_test$/.");
  for (const other of otherUrls) {
    if (!other) continue;
    let o: Target;
    try {
      o = effectiveTarget(parseUrl(other));
    } catch {
      continue; // an unparsable non-test URL cannot be the same target
    }
    if (o.host === t.host && o.port === t.port && o.database === t.database) {
      throw new Error("REFUSED: TEST_DATABASE_URL targets the same database as DATABASE_URL/DIRECT_URL.");
    }
  }
  return testUrl;
}

/** beforeAll timeout for setupTestDb: the Prisma CLI start-up alone can exceed Vitest's 10 s default. */
export const SETUP_TIMEOUT_MS = 120_000;

const PRISMA_CLI = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));

/** Server-side confirmation that the connected database really is the expected `_test` database. */
async function assertServerIsTestDb(db: Db, expected: string): Promise<void> {
  const rows = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  const name = rows[0]?.name ?? "";
  if (!TEST_DB_NAME.test(name) || name !== expected) throw new Error("REFUSED: connected database is not the expected _test database.");
}

/**
 * Validates the target, confirms it server-side, applies committed migrations (never reset), empties all
 * application tables and returns a client. Call once per integration test file (files run serially).
 */
export async function setupTestDb(): Promise<Db> {
  config({ path: ".env.local", quiet: true }); // never overrides variables already set
  const url = assertIsolatedTestTarget(process.env.TEST_DATABASE_URL, [process.env.DATABASE_URL, process.env.DIRECT_URL]);
  const expected = effectiveTarget(parseUrl(url)).database;

  const db = createDb(url);
  try {
    await assertServerIsTestDb(db, expected); // before any schema write
    // Empty first so leftover rows from a previous run cannot make a new migration's constraints fail.
    await truncateAll(db);

    const migrate = spawnSync(process.execPath, [PRISMA_CLI, "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, CHECKPOINT_DISABLE: "1" },
      encoding: "utf8",
    });
    if (migrate.status !== 0) throw new Error(`prisma migrate deploy failed on the test database (exit ${migrate.status}).`);

    await truncateAll(db);
    return db;
  } catch (error) {
    await db.$disconnect();
    throw error;
  }
}

/** Re-checks the database name inside the destructive statement, then truncates every application table (static SQL; %I quoting). */
async function truncateAll(db: Db): Promise<void> {
  await db.$executeRaw`DO $$
      DECLARE names text;
      BEGIN
        IF current_database() !~ '_test$' THEN RAISE EXCEPTION 'REFUSED: connected database is not a _test database'; END IF;
        SELECT string_agg(format('%I', tablename), ', ') INTO names FROM pg_tables
          WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
        IF names IS NOT NULL THEN EXECUTE 'TRUNCATE TABLE ' || names || ' CASCADE'; END IF;
      END $$`;
}
