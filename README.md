# VectorPath

AI career-intelligence web app: confirmed skills, explainable Fit/Reach/Demand matching, regional evidence and free learning plans. **Status: U01 scaffold plus the W01 foundations (U02 shell, U03 database, U14 scoring domain, U18 redaction and evidence domain). No user-facing product features are built yet.** Verified state: [progress-tracker_astra.md](progress-tracker_astra.md) §1.

## Requirements

- Node 24 LTS (`.nvmrc`), npm 12.
- Docker Desktop for the local PostgreSQL + pgvector containers (see Local database).

## Setup

```sh
npm install                  # runs postinstall: prisma generate (creates ignored lib/db/generated/)
cp .env.example .env.local   # fill in values yourself; never commit .env.local
npx playwright install chromium
```

## Local database (U03)

1. `npm run db:up` starts two loopback-only containers from `docker-compose.yml`: `db` (dev, persistent volume, `127.0.0.1:55432`) and `db-test` (disposable tmpfs, `127.0.0.1:55433`).
2. Add these three lines to `.env.local` in the project root (the folder that contains `package.json`), uncommented. They are non-secret local defaults that match `docker-compose.yml`:

   ```
   DATABASE_URL=postgresql://vectorpath:vectorpath_local@127.0.0.1:55432/vectorpath
   DIRECT_URL=postgresql://vectorpath:vectorpath_local@127.0.0.1:55432/vectorpath
   TEST_DATABASE_URL=postgresql://vectorpath:vectorpath_local@127.0.0.1:55433/vectorpath_test
   ```

3. `npm run db:deploy` applies the reviewed migrations to the dev database (`prisma migrate deploy`). It never resets.
4. `npm run db:size` reports the measured size against the 150 MB budget (9.25 MB on the empty schema; re-measure after seeding).

**Integration pre-check.** `npm run test:integration` and `npm test` run `scripts/require-test-db.mjs`. It now reads `.env.local` (existing variables are never overridden and nothing is printed). If `TEST_DATABASE_URL` is still missing, it exits with `BLOCKED:`. The harness refuses any target that is not loopback, not named `*_test`, carries a query parameter other than `schema`, `sslmode` or `connect_timeout`, or matches `DATABASE_URL`/`DIRECT_URL`. It re-checks `current_database()` on the server before migrating or truncating. Each integration file spends about 10 s on Prisma setup.

### Migration rule: never let Prisma drop protected indexes

Prisma cannot model the HNSW indexes on the `Unsupported("vector(768)")` columns, and `migrate diff` proposes dropping them. The partial index `LlmCache_general_key_partial_idx` is also proposed for dropping.

- **Never** keep a `DROP INDEX` on any `*_hnsw_idx`, `*_trgm_idx` or `*_partial_idx` index.
- `npm run db:migrate` runs `prisma migrate dev --create-only`. It is **interactive-only** while this drift exists: it stops for input and does not run non-interactively. Never answer yes to a protected drop.
- Manual route (the one used for U03, see [backend-U03.md](docs/agents/handoffs/backend-U03.md) round 2):
  1. Create a folder `prisma/migrations/<timestamp>_<name>/`, then run `npx prisma migrate diff --from-config-datasource --to-schema --script` and save the output as its `migration.sql`.
  2. Delete every `DROP INDEX` line whose name ends in `_hnsw_idx`, `_trgm_idx` or `_partial_idx`.
  3. Append the hand-written SQL (constraints, extensions) and review the whole file.
  4. Run `npm run db:deploy`.
- Applied migrations are immutable. Add a new migration instead of editing one.
- `tests/unit/db/migrations.test.ts` fails if any migration file contains a protected `DROP INDEX`.

## Commands

| Command | State |
|---|---|
| `npm run dev` | Works — minimal page and `/api/health` (U01) |
| `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build` | Work |
| `npm run test:integration`, `npm test` | Work when `TEST_DATABASE_URL` is set (see Local database); otherwise fail with `BLOCKED:` |
| `npm run test:e2e` | Works — isolated port 3100 and `.next-e2e` output, third-party network blocked on server and browser |
| `npm run check:docs` | Works — document links, planned paths and route listing |
| `npm run agents:audit` | Works — ownership audit of the working tree (`-- --role <r> --declared <file>`) |
| `npm run db:up`, `db:deploy`, `db:size`, `db:generate` | Work against the local Docker database |
| `npm run db:migrate` | Interactive-only while HNSW drift exists (see Migration rule) |
| `db:studio`, `seed:*`, `eval*`, `purge:stale`, `check:links` | Not verified or **fail on purpose** — "not implemented yet", with the owning unit |

## Project documents

Start from [CLAUDE.md](CLAUDE.md), then [progress-tracker_astra.md](progress-tracker_astra.md). Provider verification: [docs/verification/providers.md](docs/verification/providers.md). Agent board: [docs/agents/board.md](docs/agents/board.md).
