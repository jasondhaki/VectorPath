# VectorPath — Authoritative project file tree

## 1. Root and placement rules

Use this layout for VectorPath. All paths are relative to the application repository root. Keep the eight instruction documents and this file at the root; create implementation files in their assigned roadmap units.

- [`CLAUDE.md`](CLAUDE.md) — Claude Code instructions; session boot, invariants, commands.
- [`claude-agents_astra.md`](claude-agents_astra.md) — roles, write ownership, contracts, review and verification protocol.
- [`project-file-tree.md`](project-file-tree.md) — this authoritative placement map.
- [`project-overview_astra.md`](project-overview_astra.md) — product, requirements, acceptance.
- [`architecture_astra.md`](architecture_astra.md) — boundaries, data, security, formulas, runtime behavior.
- [`code-standards_astra.md`](code-standards_astra.md) — implementation and testing rules.
- [`ui-context_astra.md`](ui-context_astra.md) — one visual system and page behavior.
- [`ai-workflow-rules_astra.md`](ai-workflow-rules_astra.md) — execution and approval rules.
- [`progress-tracker_astra.md`](progress-tracker_astra.md) — implementation units, decisions, unresolved checks.

Use the root-level application directories shown below. Do not introduce a duplicate context directory, tracker or route hierarchy.

## 2. Root configuration — U01 unless noted

### Root directory hierarchy

- **Application root**
  - [`CLAUDE.md`](CLAUDE.md) — Claude Code instructions.
  - [`claude-agents_astra.md`](claude-agents_astra.md) — agent operating manual.
  - [`project-file-tree.md`](project-file-tree.md) — authoritative tree.
  - [`project-overview_astra.md`](project-overview_astra.md) — product scope.
  - [`architecture_astra.md`](architecture_astra.md) — technical contracts.
  - [`code-standards_astra.md`](code-standards_astra.md) — engineering rules.
  - [`ui-context_astra.md`](ui-context_astra.md) — visual and interaction system.
  - [`ai-workflow-rules_astra.md`](ai-workflow-rules_astra.md) — execution rules.
  - [`progress-tracker_astra.md`](progress-tracker_astra.md) — roadmap and status.
  - Root configuration and generated files — enumerated in the table below.
  - [`app/`](app/) — routes, page shells and thin handlers/actions.
  - [`components/`](components/) — reusable UI by feature.
    - [`components/ui/`](components/ui/) — generated primitives.
    - [`components/shared/`](components/shared/) — provenance and reusable states.
  - [`lib/`](lib/) — domain, services and I/O boundaries.
    - [`lib/config/`](lib/config/), [`lib/domain/`](lib/domain/), [`lib/services/`](lib/services/), [`lib/db/`](lib/db/).
    - [`lib/session/`](lib/session/), [`lib/cache/`](lib/cache/), [`lib/parsing/`](lib/parsing/).
    - [`lib/integrations/`](lib/integrations/), [`lib/embeddings/`](lib/embeddings/), [`lib/llm/`](lib/llm/), [`lib/retrieval/`](lib/retrieval/).
  - [`types/`](types/) — shared validated contracts.
  - [`prisma/`](prisma/) — schema and migrations.
  - [`data/`](data/) — approved application data.
    - [`data/config/`](data/config/), [`data/resources/`](data/resources/), [`data/personas/`](data/personas/), [`data/fixtures/`](data/fixtures/).
    - [`data/raw/`](data/raw/), [`data/cache/`](data/cache/) — local ignored working data.
  - [`scripts/`](scripts/) — explicit CLI entry points.
    - [`scripts/agents/`](scripts/agents/) — ownership auditing.
  - [`tests/`](tests/) — setup, unit, integration and browser suites.
    - [`tests/fixtures/`](tests/fixtures/) — contract/synthetic/model test inputs.
  - [`eval/`](eval/) — protected benchmark inputs, captures and results.
  - [`docs/`](docs/) — agent records, verification evidence and submission material.
    - [`docs/agents/`](docs/agents/) — wave records.
    - [`docs/verification/`](docs/verification/) — official-source verification evidence.
    - [`docs/submission/`](docs/submission/) — approved release artifacts.
  - [`.claude/`](.claude/) — verified agent definitions, settings and hooks.
  - [`.github/`](.github/) — CI configuration.
  - [`public/`](public/) — licensed public assets only.

### Root files

| Planned file | Contents / responsibility |
|---|---|
| [`package.json`](package.json) | npm scripts, engines and exact compatible dependency choices; lead owns changes |
| [`package-lock.json`](package-lock.json) | npm-generated dependency lock; never hand-edit |
| [`.nvmrc`](.nvmrc) | Selected supported Node LTS version |
| [`tsconfig.json`](tsconfig.json) | Strict TypeScript and root import alias |
| [`next-env.d.ts`](next-env.d.ts) | Next.js-generated declarations |
| [`next.config.ts`](next.config.ts) | Framework configuration; no secrets |
| [`eslint.config.mjs`](eslint.config.mjs) | Boundary restrictions and code rules |
| [`postcss.config.mjs`](postcss.config.mjs) | Tailwind v4 integration |
| [`components.json`](components.json) | shadcn generator configuration |
| [`vitest.config.ts`](vitest.config.ts) | Unit/integration projects and network-blocking setup |
| [`playwright.config.ts`](playwright.config.ts) | Fixture-mode browser testing with isolated server/output |
| [`prisma.config.ts`](prisma.config.ts) | Installed Prisma version's migration and environment configuration; U03 |
| [`proxy.ts`](proxy.ts) | Only if required by the pinned Next.js version; headers, not authorization; U04 |
| [`vercel.json`](vercel.json) | Deployment region and supported function settings; U27 |
| [`.env.example`](.env.example) | Variable names and non-secret safe defaults; committed |
| [`.env.local`](.env.local) | Human-provided local secrets; ignored, never read into agent messages |
| [`.gitignore`](.gitignore) | Dependencies, build output, secrets, raw data, caches, local agents and test artifacts |
| [`README.md`](README.md) | Actual setup, migration, seed, demo and deployment instructions; U01 then maintained |
| [`CHANGELOG.md`](CHANGELOG.md) | Verified wave summaries, not speculative achievements |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Typecheck, lint, tests, build and isolated fixture E2E; no production credentials |
| [`AGENTS.md`](AGENTS.md) | Generated and re-added by `next dev`; points agents to the bundled Next.js docs in node_modules/next/dist/docs; lead-owned |
| [`docker-compose.yml`](docker-compose.yml) | Local isolated PostgreSQL + pgvector: `db` (dev, named volume, 127.0.0.1:55432) and `db-test` (disposable tmpfs, 127.0.0.1:55433, `_test` database); U03, backend |

No Tailwind configuration file is needed for the selected v4 CSS-first approach unless a verified dependency requires one and the lead records that exception.

## 3. Application routes

All pages render through services. All mutations are backend-owned actions or handlers. A profile identifier in a URL never authorizes access.

| Planned path | URL / behavior |
|---|---|
| [`app/layout.tsx`](app/layout.tsx) | Root dark theme, fonts, metadata and shared providers |
| [`app/globals.css`](app/globals.css) | Complete token definitions, semantic mappings, base and graph styles |
| [`app/page.tsx`](app/page.tsx) | Landing; four personas; analyze/manual entry |
| [`app/loading.tsx`](app/loading.tsx), [`app/error.tsx`](app/error.tsx), [`app/not-found.tsx`](app/not-found.tsx) | Root loading, safe failure and not-found boundaries |
| [`app/new/page.tsx`](app/new/page.tsx), [`app/new/actions.ts`](app/new/actions.ts) | CV intake and manual profile creation |
| [`app/p/[profileId]/layout.tsx`](app/p/[profileId]/layout.tsx) | Authorized profile shell; demo read-only notice |
| [`app/p/[profileId]/loading.tsx`](app/p/[profileId]/loading.tsx), [`app/p/[profileId]/error.tsx`](app/p/[profileId]/error.tsx) | Profile-level async boundaries |
| [`app/p/[profileId]/page.tsx`](app/p/[profileId]/page.tsx) | Overview and next action |
| [`app/p/[profileId]/skills/page.tsx`](app/p/[profileId]/skills/page.tsx), [`app/p/[profileId]/skills/actions.ts`](app/p/[profileId]/skills/actions.ts) | Evidence review, preferences, confirmation; graph tab added in U29 |
| [`app/p/[profileId]/roles/page.tsx`](app/p/[profileId]/roles/page.tsx), [`app/p/[profileId]/roles/actions.ts`](app/p/[profileId]/roles/actions.ts) | Opportunities and recomputation |
| [`app/p/[profileId]/roles/[soc]/page.tsx`](app/p/[profileId]/roles/[soc]/page.tsx) | Role facts, explanation, gaps, jobs, education and outlook |
| [`app/p/[profileId]/roles/[soc]/plan/page.tsx`](app/p/[profileId]/roles/[soc]/plan/page.tsx), [`app/p/[profileId]/roles/[soc]/plan/actions.ts`](app/p/[profileId]/roles/[soc]/plan/actions.ts) | Complete learning plan and progress |
| [`app/p/[profileId]/paths/page.tsx`](app/p/[profileId]/paths/page.tsx) | Career paths; role target or green lens |
| [`app/p/[profileId]/compare/page.tsx`](app/p/[profileId]/compare/page.tsx), [`app/p/[profileId]/compare/actions.ts`](app/p/[profileId]/compare/actions.ts) | Pasted job description, requirements review, gap report and job-target plan; U33 |
| [`app/p/[profileId]/interests/page.tsx`](app/p/[profileId]/interests/page.tsx), [`app/p/[profileId]/interests/actions.ts`](app/p/[profileId]/interests/actions.ts) | Optional RIASEC quick check; U35 |
| [`app/p/[profileId]/advisor/page.tsx`](app/p/[profileId]/advisor/page.tsx) | Read-only grounded advisor; U36 |
| [`app/p/[profileId]/export/page.tsx`](app/p/[profileId]/export/page.tsx) | Print-friendly plan selection; U38 |
| [`app/market/[country]/page.tsx`](app/market/[country]/page.tsx), [`app/market/[country]/loading.tsx`](app/market/[country]/loading.tsx), [`app/market/[country]/error.tsx`](app/market/[country]/error.tsx) | Public regional pulse |
| [`app/methodology/page.tsx`](app/methodology/page.tsx) | Sources, licenses, limitations, formulas and measured evaluation |
| [`app/privacy/page.tsx`](app/privacy/page.tsx), [`app/privacy/actions.ts`](app/privacy/actions.ts) | Consent, retention, export and confirmed deletion |
| [`app/dev/components/page.tsx`](app/dev/components/page.tsx) | Contract-fixture component gallery; not found in production |
| [`app/api/cv/analyze/route.ts`](app/api/cv/analyze/route.ts) | Bounded streamed upload analysis |
| [`app/api/cv/status/[analysisId]/route.ts`](app/api/cv/status/[analysisId]/route.ts) | Owner-only recovery/status lookup, not a background worker |
| [`app/api/jobs/route.ts`](app/api/jobs/route.ts) | Budgeted public live-market listing lookup; persona pages never call it |
| [`app/api/advisor/route.ts`](app/api/advisor/route.ts) | Authorized, rate-limited grounded response stream; U36 |
| [`app/api/privacy/export/route.ts`](app/api/privacy/export/route.ts) | Owner-only JSON download; no-store |
| [`app/api/plans/[planId]/export/route.ts`](app/api/plans/[planId]/export/route.ts) | Authorized Markdown plan download; U38 |
| [`app/api/health/route.ts`](app/api/health/route.ts) | Minimal liveness; no secrets or provider payloads |

Add route-level loading/error boundaries when a nested page needs a different layout; record each addition here. Do not put reusable feature components inside route folders. Optional accounts are not scaffolded until U39 is approved.

## 4. Components

- [`components/ui/`](components/ui/) — generated shadcn primitives, lead installs through the CLI.
- [`components/layout/`](components/layout/) — app shell, sidebar, topbar, mobile navigation, profile switcher. U02 built: [`app-shell.tsx`](components/layout/app-shell.tsx) (server component: 56 px topbar, 64 px rail at 768–1279 px, 240 px sidebar at ≥1280 px, bottom bar below 768 px), [`nav-items.ts`](components/layout/nav-items.ts) (destinations, all unbuilt until their unit) and [`mobile-menu.tsx`](components/layout/mobile-menu.tsx) (the shell's only client leaf, a modal dialog). Profile switcher not built yet.
- [`components/persona/`](components/persona/) — persona cards, demo banner, precomputed path teaser.
- [`components/upload/`](components/upload/) — dropzone, progress stage list, consent, manual-entry form.
- [`components/skills/`](components/skills/) — review table, evidence quote, inference note, skill chip, skills graph with accessible list.
- [`components/opportunities/`](components/opportunities/) — ranked row, Fit/Reach/Demand strip, filters and detail panel.
- [`components/gap/`](components/gap/) — gap matrix, prioritized bars, pasted-job form and requirements review.
- [`components/plan/`](components/plan/) — timeline, resource row, project milestone, progress and print layout.
- [`components/paths/`](components/paths/) — React Flow canvas, station node, route edge, legend, inspector and ordered-list alternative.
- [`components/market/`](components/market/) — demand panel, listings, regional table and coverage note.
- [`components/outlook/`](components/outlook/) — cited projection panel; P2.
- [`components/interests/`](components/interests/) — quick check and six-dimension result; P2.
- [`components/advisor/`](components/advisor/) — chat and reference list; P2.
- [`components/privacy/`](components/privacy/) — export controls, consent and delete dialog.
- [`components/shared/source-badge.tsx`](components/shared/source-badge.tsx) — external provenance, observed period and fetch date.
- [`components/shared/calculation-note.tsx`](components/shared/calculation-note.tsx) — model version, assumptions and calculation time, not an external-source claim.
- [`components/shared/confidence-tag.tsx`](components/shared/confidence-tag.tsx) — support quality, never success probability.
- [`components/shared/empty-state.tsx`](components/shared/empty-state.tsx), [`components/shared/error-state.tsx`](components/shared/error-state.tsx), [`components/shared/no-data-state.tsx`](components/shared/no-data-state.tsx) — distinct states. U02 added [`components/shared/state-panel.tsx`](components/shared/state-panel.tsx) (shared frame with `headingLevel` 1–3, and LoadingState); [`no-data-state.tsx`](components/shared/no-data-state.tsx) also exports UnavailableState and StaleState.
- [`components/shared/attribution/`](components/shared/attribution/) — provider-specific required credits.

Feature folders contain kebab-case files named for the component. The UI specification is the component behavior contract; the tree is not permission to generate empty components in advance.

## 5. Application libraries and shared contracts

### Configuration, utilities and contracts

- [`lib/config/env.ts`](lib/config/env.ts) — validated server environment.
- [`lib/config/site.ts`](lib/config/site.ts) — single product-name constant.
- [`lib/config/features.ts`](lib/config/features.ts) — unfinished P1/P2 flags, default disabled.
- [`lib/config/regions.ts`](lib/config/regions.ts) — validated region mappings loaded from committed configuration.
- [`lib/utils.ts`](lib/utils.ts) — class merging only; no domain or provider logic.
- [`types/`](types/) — Zod-first shared contracts: provenance, session, CV stages, profile, taxonomy, market, scoring, matches, gaps, plans, paths, job target, outlook, interests, advisor, privacy and evaluation. Create one contract file per area as its unit starts; lead owns all shared changes.

### Pure domain — no I/O

- [`lib/domain/scoring/weights.ts`](lib/domain/scoring/weights.ts) — all tunable constants and scoring version.
- [`lib/domain/scoring/requirements.ts`](lib/domain/scoring/requirements.ts) — §7.1 requirement normalization, dedup and user-level helpers (U14).
- [`lib/domain/scoring/coverage.ts`](lib/domain/scoring/coverage.ts), [`lib/domain/scoring/fit.ts`](lib/domain/scoring/fit.ts), [`lib/domain/scoring/reach.ts`](lib/domain/scoring/reach.ts), [`lib/domain/scoring/demand.ts`](lib/domain/scoring/demand.ts), [`lib/domain/scoring/opportunity.ts`](lib/domain/scoring/opportunity.ts), [`lib/domain/scoring/rank.ts`](lib/domain/scoring/rank.ts) — formulas and explainable breakdowns.
- [`lib/domain/normalization/`](lib/domain/normalization/) — alias/fuzzy candidate rules and confidence decisions, not database lookups.
- [`lib/domain/redaction/`](lib/domain/redaction/) — contact minimization; does not promise anonymization. Named modules: [`redact.ts`](lib/domain/redaction/redact.ts) (minimization and `REDACTION_NOTICE`) and [`limits.ts`](lib/domain/redaction/limits.ts) (single source of text limits, counted in code points).
- [`lib/domain/evidence/`](lib/domain/evidence/) — normalized quote matching with original-offset mapping. Named module: [`quotes.ts`](lib/domain/evidence/quotes.ts) (U18).
- [`lib/domain/gap/`](lib/domain/gap/) — occupation/JD requirement comparisons.
- [`lib/domain/plan/`](lib/domain/plan/) — workload, prerequisite DAG, resource selection, phase packing, dates.
- [`lib/domain/paths/`](lib/domain/paths/) — graph construction rules and bounded k-shortest search.
- [`lib/domain/interests/`](lib/domain/interests/) — optional six-dimension RIASEC math.
- [`lib/domain/baseline/bm25.ts`](lib/domain/baseline/bm25.ts), [`lib/domain/evaluation/`](lib/domain/evaluation/) — baseline and metrics.

### Boundary owners

- [`lib/db/client.ts`](lib/db/client.ts), [`lib/db/vector.ts`](lib/db/vector.ts) — Prisma client and all parameterized vector SQL.
- [`lib/db/size.ts`](lib/db/size.ts) — measured storage, extension and index sizes for `npm run db:size`.
- [`lib/db/generated/`](lib/db/generated/) — generated Prisma client; git-ignored; regenerated by `postinstall` and `db:generate`; never edited.
- [`lib/db/`](lib/db/) — additional query modules for sessions, profiles, taxonomy, markets, plans, cache, ingestion, demo snapshots and deletion. Only this directory imports the Prisma client.
- [`lib/session/`](lib/session/) — guest token, scoped access capability, CSRF/origin checks and request limits.
- [`lib/cache/`](lib/cache/) — TTL policy, atomic provider budget reservations and cache orchestration through database helpers.
- [`lib/parsing/`](lib/parsing/) — bounded PDF/DOCX/TXT text parsing; no raw-file persistence.
- [`lib/services/`](lib/services/) — use cases: CV analysis, profile edits, matching, role detail, plan, path, market, demo, privacy, JD comparison, outlook and advisor.
- [`lib/integrations/onet/`](lib/integrations/onet/), [`lib/integrations/lightcast/`](lib/integrations/lightcast/), [`lib/integrations/adzuna/`](lib/integrations/adzuna/), [`lib/integrations/worldbank/`](lib/integrations/worldbank/) — one adapter per approved source.
- [`lib/integrations/hn/`](lib/integrations/hn/) — optional P2 public mention-trend adapter, only after terms check.
- [`lib/integrations/commoncrawl/`](lib/integrations/commoncrawl/) — loader for the curated local news corpus in data/news/; no crawling or bulk Common Crawl download (architecture §12.5).
- [`lib/integrations/link-checker/`](lib/integrations/link-checker/) — allowlisted, SSRF-safe catalog link checks; not arbitrary user URL fetching.
- [`lib/embeddings/`](lib/embeddings/) — model adapter and resumable taxonomy embedding. Runtime personal phrases use approved personal-safe processing or local lookup, never an unpaid general endpoint.
- [`lib/llm/router.ts`](lib/llm/router.ts), [`lib/llm/registry.ts`](lib/llm/registry.ts), [`lib/llm/grounding.ts`](lib/llm/grounding.ts) — privacy routing, task limits and output validation.
- [`lib/llm/prompts/`](lib/llm/prompts/), [`lib/llm/schemas/`](lib/llm/schemas/), [`lib/llm/providers/`](lib/llm/providers/) — versioned prompt files, private task schemas and SDK adapters.
- [`lib/retrieval/`](lib/retrieval/) — bounded retrieval of licensed fact records and citation assembly, through database helpers; no arbitrary web crawler.

Each integration uses an entry module, live client, fixture client, provider schema and mapper. Import recorded fixtures from [`data/fixtures/`](data/fixtures/), **never from test-only folders in production**. Personal mock outputs belong only to test fixtures and synthetic demo snapshots.

## 6. Database, data and scripts

- [`prisma/schema.prisma`](prisma/schema.prisma) — shared reference tables, owner-scoped tables and operational tables.
- [`prisma/migrations/`](prisma/migrations/) — append-only reviewed SQL migrations, extensions, indexes and constraints. Current: [`20261020191333_init`](prisma/migrations/20261020191333_init/migration.sql) (applied, immutable) and [`20261021010000_review_fixes`](prisma/migrations/20261021010000_review_fixes/migration.sql) (applied; embedding identity, composite FKs, text-length and LlmCache scope constraints).
- [`data/config/sources.json`](data/config/sources.json) — verified source version, dictionary URL, license, checksum, import counts and approved usage.
- [`data/config/regions.json`](data/config/regions.json) — BD/IN/GB/US, provider codes, currency and locale.
- [`data/config/sector-map.json`](data/config/sector-map.json), [`data/config/green-roles.json`](data/config/green-roles.json) — explicit sector mappings and verified occupation-code targets.
- [`data/resources/catalog.json`](data/resources/catalog.json), [`data/resources/prerequisites.json`](data/resources/prerequisites.json), [`data/resources/milestones.json`](data/resources/milestones.json) — reviewed free resources, skill dependencies and generic project templates.
- [`data/personas/student-dhaka.md`](data/personas/student-dhaka.md), [`data/personas/technician-chattogram.md`](data/personas/technician-chattogram.md), [`data/personas/teacher-manchester.md`](data/personas/teacher-manchester.md), [`data/personas/retail-bengaluru.md`](data/personas/retail-bengaluru.md) — fictional CVs.
- [`data/personas/meta.json`](data/personas/meta.json) — preferences, scenario IDs and generation versions.
- [`data/fixtures/`](data/fixtures/) — approved recorded public source responses by provider (onet, lightcast, adzuna, worldbank, news), with provenance manifests; no synthetic market facts in production.
- [`data/embeddings/`](data/embeddings/) — committed precomputed 768-d L2-normalized public reference vectors with model/dimension/task/normalization/text-hash manifest (architecture §12.3); separate files per embedding identity.
- [`data/news/`](data/news/) — curated local public-news corpus for cited outlooks: URL, publisher, date, usage basis and short excerpt per entry (architecture §12.5).
- [`data/raw/`](data/raw/), [`data/cache/`](data/cache/) — ignored developer downloads/checkpoints; never deployment inputs by accident.
- [`scripts/seed-onet.ts`](scripts/seed-onet.ts), [`scripts/seed-lightcast.ts`](scripts/seed-lightcast.ts), [`scripts/seed-config.ts`](scripts/seed-config.ts) — source imports and resolved region/sector/green configuration.
- [`scripts/seed-embed.ts`](scripts/seed-embed.ts), [`scripts/seed-map-software.ts`](scripts/seed-map-software.ts) — taxonomy vectors and mappings.
- [`scripts/seed-resources.ts`](scripts/seed-resources.ts), [`scripts/check-links.ts`](scripts/check-links.ts), [`scripts/seed-graph.ts`](scripts/seed-graph.ts) — resource validation and graph build.
- [`scripts/seed-macro.ts`](scripts/seed-macro.ts), [`scripts/seed-market.ts`](scripts/seed-market.ts) — licensed, budgeted market imports.
- [`scripts/seed-personas.ts`](scripts/seed-personas.ts) — immutable scenario snapshots and precomputed explanations/plans/paths.
- [`scripts/seed-outlook.ts`](scripts/seed-outlook.ts) — optional P2 source-fact/projection generation.
- [`scripts/db-size.ts`](scripts/db-size.ts), [`scripts/purge-stale.ts`](scripts/purge-stale.ts) — storage budget and authorized retention maintenance.
- [`scripts/eval.ts`](scripts/eval.ts), [`scripts/eval-capture.ts`](scripts/eval-capture.ts) — offline metric evaluation versus explicit, opt-in synthetic extraction capture.
- [`scripts/check-tokens.mjs`](scripts/check-tokens.mjs), [`scripts/check-docs.mjs`](scripts/check-docs.mjs) — token rules, links, route/tree drift and dependency consistency; each has a `.d.mts` type declaration for tests.
- [`scripts/not-implemented.mjs`](scripts/not-implemented.mjs) — target of planned npm scripts; always exits 1 naming the owning unit.
- [`scripts/require-test-db.mjs`](scripts/require-test-db.mjs) — fails integration/aggregate tests clearly when `TEST_DATABASE_URL` is absent. Loads `.env.local` without overriding existing variables and prints nothing.
- [`scripts/agents/ownership-lib.mjs`](scripts/agents/ownership-lib.mjs) — shared resolver used by the ownership hook and diff audit.
- [`tests/setup/block-network.mjs`](tests/setup/block-network.mjs) — loopback-only network guard for unit tests and the E2E server (via NODE_OPTIONS); [`tests/e2e/fixtures.ts`](tests/e2e/fixtures.ts) blocks browser third-party requests.

Scripts are thin CLI entry points. They load ignored environment files explicitly where required by the installed tools, but never print values. Shared business logic stays in libraries.

## 7. Tests and evaluation

- [`tests/setup/`](tests/setup/) — unit/network blocking, isolated database guard, fixture defaults. Named: [`integration-db.ts`](tests/setup/integration-db.ts) (isolated test-DB guard and harness, U03).
- [`tests/unit/`](tests/unit/) — mirrors library and component paths; builders own their tests. Current: [`tests/unit/db/`](tests/unit/db/), [`tests/unit/components/`](tests/unit/components/), [`tests/unit/domain/`](tests/unit/domain/).
- [`tests/integration/`](tests/integration/) — database, access, cascade deletion, concurrency, ingestion and service contracts. Current (U03): [`guard.test.ts`](tests/integration/guard.test.ts), [`vector.test.ts`](tests/integration/vector.test.ts), [`cascade-scope.test.ts`](tests/integration/cascade-scope.test.ts).
- [`tests/e2e/`](tests/e2e/) — persona, CV/manual review, matching, plans, paths, regional comparison, JD, privacy and P2 journeys. Current (W01): [`scaffold.spec.ts`](tests/e2e/scaffold.spec.ts), [`shell.spec.ts`](tests/e2e/shell.spec.ts), [`mobile.spec.ts`](tests/e2e/mobile.spec.ts), [`rail.spec.ts`](tests/e2e/rail.spec.ts) and [`wide.spec.ts`](tests/e2e/wide.spec.ts), run in the 375/1024/1440 px projects of `playwright.config.ts`.
- [`tests/fixtures/contracts/`](tests/fixtures/contracts/) — lead-owned DTO examples validated against shared schemas.
- [`tests/fixtures/synthetic/`](tests/fixtures/synthetic/) — explicitly fake edge cases; never shown as real market facts.
- [`tests/fixtures/llm/`](tests/fixtures/llm/) — deterministic synthetic task mocks, not benchmark evidence of real-model quality.
- [`eval/cvs/`](eval/cvs/) — twenty synthetic benchmark CVs.
- [`eval/labels.json`](eval/labels.json), [`eval/split.json`](eval/split.json) — frozen gold labels and tuning/holdout split, approved before tuning.
- [`eval/captures/`](eval/captures/) — recorded real-provider outputs for synthetic CVs, model/prompt/version manifest.
- [`eval/results/`](eval/results/) — committed reproducible measurements, source hashes and baseline comparison.

## 8. Claude Code operations and documentation

Create runtime agent files only in U01 after checking the installed Claude Code schema; the playbook is not itself an installed hook.

- [`.claude/agents/`](.claude/agents/) — nine role definitions: lead, backend, data, domain, frontend, reviewer, QA, debugger and scribe, using the role names in the playbook.
- [`.claude/ownership.json`](.claude/ownership.json) — one writer per path plus time-bound grants.
- [`.claude/settings.json`](.claude/settings.json) — minimal supported project settings and verified hooks; no permission bypass.
- [`.claude/hooks/enforce-ownership.mjs`](.claude/hooks/enforce-ownership.mjs), [`.claude/hooks/guard-commands.mjs`](.claude/hooks/guard-commands.mjs) — defense-in-depth checks, not a security sandbox.
- [`scripts/agents/check-ownership.mjs`](scripts/agents/check-ownership.mjs) — staged/unstaged/untracked/branch diff audit.
- [`docs/agents/board.md`](docs/agents/board.md) — active wave, exact owners, frozen contracts, locks and blockers.
- [`docs/agents/handoffs/`](docs/agents/handoffs/), [`docs/agents/reviews/`](docs/agents/reviews/), [`docs/agents/qa/`](docs/agents/qa/), [`docs/agents/bugs/`](docs/agents/bugs/), [`docs/agents/fixes/`](docs/agents/fixes/) — evidence records by unit/wave/bug.
- [`docs/verification/providers.md`](docs/verification/providers.md) — official-source verification log, dated limits, terms and model approvals; U00.
- [`docs/submission/walkthrough.md`](docs/submission/walkthrough.md), [`docs/submission/checklist.md`](docs/submission/checklist.md), [`docs/submission/pitch.md`](docs/submission/pitch.md) — U41 submission material.
- [`public/`](public/) — public product assets and licensed local fonts only; no CVs or provider keys.

## 9. Generated, local and deliberately absent

Ignored: [`node_modules/`](node_modules/), [`.next/`](.next/), [`coverage/`](coverage/), [`playwright-report/`](playwright-report/), [`test-results/`](test-results/), [`.claude/worktrees/`](.claude/worktrees/), [`.claude/settings.local.json`](.claude/settings.local.json), raw/cache folders and local secret files. Generated Prisma output is `lib/db/generated/`: mapped in §5 and git-ignored (U03 done).

**Do not introduce by default:** Clerk, blob storage, Redis, Inngest, a runtime ingestion worker, Common Crawl ingestion, a second vector database, unlicensed job-board crawlers, or duplicate route hierarchies. Those are not missing folders; they are deliberate scope decisions.

## 10. Change control

1. Before creating a new top-level directory, route, service boundary or shared data artifact, check this map.
2. An implementation detail inside an existing feature directory may be added by its owner; record named public modules and route changes here in the same unit.
3. Structural changes require the lead's approved contract and a synchronized architecture/ownership update. The scribe updates this map after verification.
4. U01 creates a documentation check for relative links, file placement and route consistency. It distinguishes planned application paths from existing files.
5. Start from [`CLAUDE.md`](CLAUDE.md), then follow the dependency-ready units in [`progress-tracker_astra.md`](progress-tracker_astra.md).
