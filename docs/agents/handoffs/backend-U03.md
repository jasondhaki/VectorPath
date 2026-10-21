# Handoff: U03 Database and migrations (vp-backend)

Date: 2026-10-21. Revision: uncommitted working tree (no commits authorised). Contract lock v1 (board.md hashes), read-only; no contract change.
Schema lock: held by backend for U03. **Release it after review and integration.**

## Acceptance (copied) and result

> Add core/reference/operational schema, private cascade relationships, vector/trigram extensions, indexes, client and query boundaries. Coordinate QA-owned isolated test setup and integration configuration; later P2-specific migrations may extend the schema.
> Done when: migrations apply to an isolated database, vector round-trip/nearest lookup passes, scope/cascade constraints work and npm run db:size reports measured size. The integration harness and aggregate tests pass, including regression checks over accepted bootstrap work. No real production reset.

| Criterion | Evidence | Result |
|---|---|---|
| Migrations apply to an isolated DB | `prisma migrate dev` on the local dev container (127.0.0.1:55432/vectorpath). The harness runs `prisma migrate deploy` on the disposable test container (127.0.0.1:55433/vectorpath_test) and never resets. | pass |
| Vector round trip + nearest | `tests/integration/vector.test.ts`: exact 768-d round trip; null/missing keys; cosine ordering with a bounded limit; text and uuid keys; invalid input rejected before SQL; wrong dimension rejected by the column. | pass |
| Extensions and indexes | The same file asserts that `vector` and `pg_trgm` are installed, that 3 HNSW and 2 GIN trigram indexes exist, and that a trigram typo lookup works. | pass |
| Scope/cascade constraints | `tests/integration/cascade-scope.test.ts` (11 tests). Each rejection asserts the exact constraint name. | pass |
| db:size measured | 9.22 MB total on the empty schema; vector indexes 0.05 MB; pg_trgm 1.6, vector 0.8.1; budget 150 MB. | pass |
| Harness + aggregate | `npm test` exit 0: unit 275/275, integration 32/32. | pass |
| R3-10 real test-target guard | `tests/setup/integration-db.ts` checks for a loopback host, a `^[a-z0-9_]+_test$` name and a target different from DATABASE_URL/DIRECT_URL. Before it truncates, it checks `current_database()` on the server. `tests/integration/guard.test.ts` has 13 refusal/acceptance cases, including one that confirms credentials are never echoed. A live run against the dev DB was refused with `REFUSED: test database name must match`. | pass |

## Commands run (2026-10-21, exit codes)

- `docker compose up -d --wait` → 0. Both containers were healthy.
- `npx prisma generate` → 0. `npx prisma migrate dev --create-only --name init` (dev DB) → 0. I then added the hand-written SQL.
- `npx prisma migrate dev` (dev DB) → applied. The process then waited for input because of index drift (see Limitations) and I stopped it. `npx prisma migrate status` → "Database schema is up to date!"
- `npm run typecheck` → 0
- `npm run lint` → 0, which includes check-tokens
- `TEST_DATABASE_URL=postgresql://vectorpath:vectorpath_local@127.0.0.1:55433/vectorpath_test npm test` → 0 (unit 275, integration 32)
- An earlier `npm test` run → 1. The cause was frontend's in-flight `tests/unit/components/shell.test.ts`, which passes in the final run.
- `npm run test:integration` without TEST_DATABASE_URL → 1, printing the `BLOCKED:` message as designed.
- `DATABASE_URL=…55432/vectorpath npx tsx --conditions=react-server scripts/db-size.ts` → 0
- `npm run agents:audit` → 0 (174 entries)
- Not run: `npm run build`, dev and E2E, because they were not assigned.

## Changed paths

- `docker-compose.yml`: services `db` (dev, volume, 55432) and `db-test` (tmpfs, 55433). Both use `pgvector/pgvector:0.8.1-pg17` and bind to loopback only.
- `prisma/schema.prisma`, `prisma/migrations/migration_lock.toml`, `prisma/migrations/20261020191333_init/migration.sql`. The migration is now applied to the dev DB and must be treated as immutable.
- `prisma.config.ts`: loads `.env.local` without overriding variables already set. Uses `DIRECT_URL || DATABASE_URL`.
- `lib/db/client.ts`: `createDb(url)` and a lazy singleton `getDb()`. `lib/db/vector.ts` is the only vector SQL. `lib/db/size.ts`.
- `lib/db/generated/**`: generated Prisma client. Regenerate it with `prisma generate` and do not edit it.
- `scripts/db-size.ts`
- `tests/setup/integration-db.ts`, `tests/integration/{guard,vector,cascade-scope}.test.ts` (under grant). `tests/unit/db/vector.test.ts`.
- This handoff.
- Note: I edited `tests/integration/cascade-scope.test.ts` once with a shell script to tighten the assertions. The path is inside my grant.

## Schema summary

- **Reference:** SourceManifest, IngestionRun, Occupation, OccupationTitle, OnetElement, OccupationRequirement, Skill, SkillAlias, SkillNeighbor, OccupationProfile, OccupationEdge, OccupationTask, OccupationalFact, MarketStat, MacroIndicator, SectorSignal, LearningResource, ResourceSkill, SkillPrereq, MilestoneTemplate, DemoScenario.
- **Owner-scoped:** GuestSession → Profile → CvText, ProfileExperience, ProfileEducation, ProfileSkill (software and descriptor share one table, split by `kind`), MatchRun → Match, Plan (discriminated target), PlanItemProgress (keyed by profile + target + stable item, so it survives regeneration), PathRun, JobTarget → JobRequirement.
- **Operational:** AnalysisRun, ApiCache, ApiBudget, RateLimit, LlmCache, LlmCall. LlmCall holds telemetry only and has no profile link.
- **Constraints written in migration SQL:**
  - Profile: exactly one of session or demo; weeklyHours 1–40.
  - Plan target discriminant.
  - LlmCache: a personal row must have a profileId and a general row must have none.
  - Provenance vocabularies, quote offsets, normalized Match components, and the OccupationRequirement kind↔identity rule.
- **Composite owner FKs:**
  - (Plan|JobRequirement).(jobTargetId, profileId) → JobTarget(id, profileId)
  - AnalysisRun.(profileId, sessionId) → Profile(id, sessionId)
  - A child row therefore cannot reference another owner's row at the DB level.
- **Deferred to their own migrations:** P2 tables (OutlookFact, RoleOutlook, InterestResponse). A separate local-hash-ngram-v1 vector column will be added if U08 needs one.

## Invariants touched

- **I06 (owner scope):** composite FKs and cascades, covered by cascade-scope tests.
- **I07:** CvText stores minimized text only, with no file bytes; deletion cascades are tested.
- **I13:** one vector identity per column; dimension, finite values and nonzero norm are validated in `vector.ts` and in unit and integration tests.
- **I16:** migrations are append-only.
- **I10:** the test harness talks only to loopback, and the Prisma checkpoint is disabled in the child process.

## Limitations / blockers

1. **HNSW drift hazard.** Prisma cannot model HNSW indexes on `Unsupported` columns, and `migrate diff` proposes `DROP INDEX` for all three. Every future migration must be created with `migrate dev --create-only`, and any HNSW `DROP INDEX` lines must be removed before applying. `vector.test.ts` fails if those indexes are missing. Plain `migrate dev` prompts interactively when it sees this drift.
2. `scripts/require-test-db.mjs` (QA) checks only `process.env` and does not load `.env.local`. TEST_DATABASE_URL must therefore be exported or set inline; `setupTestDb()` does load `.env.local` afterwards.
3. Scripts that import `lib/db` need `tsx --conditions=react-server`, because of `server-only`.
4. The 9.22 MB size is for the empty schema. The seeded size must be re-measured after U06–U09.
5. Setting up each integration file takes about 10 s because the Prisma CLI starts every time, so `beforeAll` uses `SETUP_TIMEOUT_MS = 120000`.

## REQUESTs to lead

**package.json scripts:**
```
"db:up": "docker compose up -d --wait",
"db:migrate": "prisma migrate dev --create-only",
"db:deploy": "prisma migrate deploy",
"db:studio": "prisma studio",
"db:size": "tsx --conditions=react-server scripts/db-size.ts",
"db:generate": "prisma generate",
"postinstall": "prisma generate"
```
`db:migrate` is `--create-only` on purpose. Review the SQL (limitation 1), then apply it with `prisma migrate dev`. `postinstall` or an explicit `db:generate` is needed because `lib/db/generated` is a build artifact. `test:integration` is unchanged.

**.gitignore:** add `lib/db/generated/`. The client is generated, and the lead decides whether to commit it instead. Note that typecheck and build need it present.

**.env.example:** keep the names, and add these comment lines:
```
# Local Docker (docker compose up -d --wait): non-secret dev defaults
# DATABASE_URL=postgresql://vectorpath:vectorpath_local@127.0.0.1:55432/vectorpath
# DIRECT_URL=postgresql://vectorpath:vectorpath_local@127.0.0.1:55432/vectorpath
# TEST_DATABASE_URL=postgresql://vectorpath:vectorpath_local@127.0.0.1:55433/vectorpath_test
```
**Human `.env.local` lines:** the three values above, uncommented.

**project-file-tree.md (scribe):**
- Add `lib/db/size.ts`, `lib/db/generated/` (ignored, generated), `tests/setup/integration-db.ts` and `tests/unit/db/`.
- docker-compose.yml now has two services: dev and a disposable test DB.

**README (scribe):** local DB setup (`npm run db:up`, `db:deploy`, `.env.local` lines) and the `--create-only` HNSW rule.

**QA:** accept or adopt the harness when the grant expires on 2026-10-22. Consider updating `require-test-db.mjs` so it loads `.env.local`.

## External usage

None. No provider or model calls were made, and nothing touched a remote DB. The only network use was Docker pulling `pgvector/pgvector:0.8.1-pg17` (two local containers are left running).

## Review fixes (round 2, review [docs/agents/reviews/U03.md](../reviews/U03.md), 2026-10-21)

The init migration is left untouched. All schema changes are in **one** follow-up migration, `prisma/migrations/20261021010000_review_fixes/migration.sql`. It is now applied to the dev DB and immutable.

`prisma migrate dev --create-only` refuses to run non-interactively when it detects the HNSW drift. I therefore generated the SQL with `prisma migrate diff --from-config-datasource --to-schema`, removed the three proposed `DROP INDEX "*_hnsw_idx"` lines, appended the hand-written constraints, and applied the result with `prisma migrate deploy`. After that, the diff from the dev DB to the schema shows only the known HNSW drops.

| # | Fix | Tests |
|---|---|---|
| 1 (blocking) | Guard bypass via query parameters. `assertIsolatedTestTarget` now refuses any query parameter outside `schema`, `sslmode` and `connect_timeout` (compared case-insensitively). The comparison with DATABASE_URL/DIRECT_URL uses their effective target: `host`/`hostaddr`/`port`/`dbname` parameters win over the URL parts, as they do in pg-connection-string. | `guard.test.ts`: `?host=` (remote and unix socket), `?host=&port=`, `?port=`, `?hostaddr=`, `?dbname=`, `?HOST=`, `?Host=`, `?service=`, `?options=`, an allowlisted parameter followed by `host`, allowlist acceptance, and the effective-target comparison. |
| 2 (blocking) | Embedding identity is stored and enforced. Added an `embeddingIdentity` column to Skill, Occupation and OccupationTitle. A CHECK on each table requires that it is set exactly when `embedding` is set and that it equals `gemini-embedding-001:768:SEMANTIC_SIMILARITY:l2`. `setEmbedding`/`getEmbedding`/`nearest` now take an identity argument, validate it against the column's allowlist (`assertIdentity`), write it alongside the vector, and filter `WHERE "embeddingIdentity" = $identity`. | `vector.test.ts` "embedding identity": `local-hash-ngram-v1` is refused on write, read and nearest; a wrong Gemini variant is refused; raw-SQL writes of a foreign identity or of a vector without identity are refused by the `*_embeddingIdentity_check` constraints. `tests/unit/db/vector.test.ts`: `assertIdentity` cases, and the constant matches the identity pinned in the migration (3 occurrences). |
| 3 | `setupTestDb` now runs a server-side `current_database()` check (name ends in `_test` and equals the parsed name) **before** `migrate deploy`. It also truncates before migrating and again afterwards; each truncation re-checks the name inside the `DO` block. The pre-migrate truncation fixes a real failure: leftover rows violated the new CHECKs and caused P3009 on the first apply. I recovered by recreating my disposable tmpfs `db-test` container. | Exercised by every integration file. |
| 4 | `nearest` runs in a transaction with `set_config('hnsw.ef_search', max(40, limit))` and `hnsw.iterative_scan = strict_order`. | `vector.test.ts` "nearest through the HNSW index": 100 rows on a test-DB client with `enable_seqscan=off`. EXPLAIN shows `Skill_embedding_hnsw_idx`, a bare query returns ≤40 rows, and `nearest(…, 100)` returns all 100 in order. |
| 5 | `PlanItemProgress.jobTargetId` has a composite FK `(jobTargetId, profileId) → JobTarget(id, profileId)` with ON DELETE CASCADE. `PlanItemProgress_target_check` ties `job:<id>` keys to `jobTargetId` and requires `occupation:%` keys when there is no JD. | `cascade-scope.test.ts`: deleting a JD removes its progress and keeps occupation progress; another owner's JD is refused by the FK; mismatched or missing keys are refused by the check. |
| 6 | LlmCache: the global unique on `key` is replaced by `@@unique([profileId, key])`, plus `LlmCache_general_key_partial_idx`, a unique index on `key` WHERE `profileId` IS NULL. | `cascade-scope.test.ts`: the same key for two profiles gives two rows and lookup by `(profileId, key)` returns the owner's own payload; a duplicate for the same owner is refused; a duplicate general key is refused. |
| 7 | Added a `MilestoneTemplate → Occupation` FK (cascade; reference to reference). Match, Plan and ProfileExperience `occupationCode` deliberately have **no** FK: reference rebuilds must not cascade into, or be blocked by, private history. Those rows are pinned by `dataVersion`, and U15/U24 validate codes. This is documented in the schema header comment. | Milestone FK and cascade test. |
| 9 | `CvText_text_length_check`: `char_length` ≤ 50,000. `JobTarget_redactedText_length_check`: ≤ 12,000. Values are read from `lib/domain/redaction/limits.ts`, which counts code points (Postgres `char_length` does too); there is no import across the boundary. | Boundary test: 50,000 × "é" is accepted; 50,001 and 12,001 characters are refused. |
| 11 | Every rejection now asserts the exact constraint name, including `AnalysisRun_sessionId_idempotencyKey_key` and pgvector's `expected 768 dimensions`. Added rejection cases for each CHECK that was untested: OccupationRequirement kind (both directions), ProfileExperience/ProfileEducation quote and provenance, JobRequirement quote and level, Profile revision, LearningResource hours. | `cascade-scope.test.ts` (16 tests), `vector.test.ts` (12 tests). |
| 12 | New static unit test, `tests/unit/db/migrations.test.ts`. It fails if any `migration.sql` has a non-comment `DROP INDEX` on a `*_hnsw_idx`, `*_trgm_idx` or `*_partial_idx` name, and includes a self-check of the detector. | Unit. |

**Deferred (limitations):**
- **#8 Demo immutability → U04.** Demo profiles and their child rows are writable at DB level; U04 must enforce read-only demos with tests.
- **#10 Retention indexes → U27.** `Profile.lastActiveAt`, `AnalysisRun.expiresAt`, `ApiCache.expiresAt` and `LlmCache.expiresAt` will be indexed when the purge job lands (Q10).

**Process note:** shell edits (`sed`/`python`) touched `prisma/schema.prisma` (backend-owned), `tests/integration/vector.test.ts` and `tests/integration/cascade-scope.test.ts` (inside my grant). `npm run agents:audit` passes.

**Round-2 changed paths:**
- `prisma/schema.prisma`
- `prisma/migrations/20261021010000_review_fixes/migration.sql` (new)
- `lib/db/vector.ts`
- `lib/db/generated/**` (regenerated)
- `tests/setup/integration-db.ts`
- `tests/integration/{guard,vector,cascade-scope}.test.ts`
- `tests/unit/db/vector.test.ts`
- `tests/unit/db/migrations.test.ts` (new)
- this handoff

**Round-2 commands (2026-10-21):**
- `prisma migrate diff` (dev) → 0
- `prisma migrate deploy` (dev) → 0
- `prisma generate` → 0
- `npm run typecheck` → 0
- `npm run lint` → 0
- `TEST_DATABASE_URL=…55433/vectorpath_test npm test` → 0 (unit 334/334, integration 53/53)
- `tsx --conditions=react-server scripts/db-size.ts` (dev) → 0: 9.25 MB of 150 MB; vector indexes 0.05 MB; vector 0.8.1, pg_trgm 1.6
- `npm run agents:audit` → 0
- `docker compose up -d --force-recreate --wait db-test` → 0 (disposable test container only)

Not run: build, dev, E2E. Schema lock is still held, pending re-review.
