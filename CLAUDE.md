# VectorPath — Claude Code entry point

## 1. Product and root

VectorPath is an AI career-intelligence web app for the buildfest topic **Career Navigator**. That topic is not the product name. The specific ask is **higher placement and relevance**, addressed through confirmed skills, explainable Fit/Reach/Demand matching, regional evidence and free learning plans.

Follow [`project-file-tree.md`](project-file-tree.md) for the application root, directories and file placement. Keep the instruction documents together at the root.

## 2. Mandatory session boot

1. Read [`progress-tracker_astra.md`](progress-tracker_astra.md): actual state, ready units, dependencies, approval blockers and schema lock.
2. Read [`ai-workflow-rules_astra.md`](ai-workflow-rules_astra.md): execution, protected artifacts, approvals and done criteria.
3. Read [`project-file-tree.md`](project-file-tree.md) before creating any file/directory or route.
4. In multi-agent work, read [`claude-agents_astra.md`](claude-agents_astra.md), current board and verified ownership before writing.
5. Read relevant context; before the first implementation unit, read all six:
   - [`project-overview_astra.md`](project-overview_astra.md) — scope, personas, requirement IDs and acceptance.
   - [`architecture_astra.md`](architecture_astra.md) — stack, boundaries, data/privacy, formulas and I01–I18.
   - [`ui-context_astra.md`](ui-context_astra.md) — dark wayfinding tokens, components and interaction states.
   - [`code-standards_astra.md`](code-standards_astra.md) — validation, code boundaries and test matrix.
   - Workflow and tracker linked above.
6. Inspect current changes and active terminals. Preserve others' work; do not automatically pull/reset/stash, create a second dev server or run destructive commands.
7. Implement one dependency-ready unit within approved scope. Record real command results, limitations and next action.

Read these operational documents at the start of every session:

@progress-tracker_astra.md
@ai-workflow-rules_astra.md

## 3. Non-negotiables

1. **Free tiers and lawful data only.** Verify current provider/version/terms/quota facts before live use. No paid plan, new service, unauthorized crawl or copied fixture to bypass licensing. Owner decision 2026-10-20: non-commercial buildfest demo at $0; the only permitted paid item is an optional Gemini key at the final stage, enabled by `GEMINI_TIER=paid` with no code change.
2. **Guest-first, no bypass.** Public fictional personas are read-only; private profiles are session-owned. Every read/write is scoped to the owner; expiry, origin/CSRF checks and deletion races are tested.
3. **No stored uploaded files.** PDF/DOCX/TXT, maximum 4,000,000 bytes, parsed in bounded memory. Minimized stored text remains personal and must export/delete/expire correctly.
4. **Evidence and confirmation.** Extracted items have verified quotes; occupation inference and self-report are labeled separately. Final personalized matching uses confirmed inputs.
5. **One scoring model.** The normalized, versioned Opportunity formula lives only in the architecture/domain implementation. No probability-of-employment claim, no LLM score and no undocumented personality factor.
6. **Facts, estimates and projections differ.** Real source dates/periods accompany external facts; calculated scores/hours identify model assumptions. Missing market data is not zero and is never invented.
7. **Personal processing is restricted.** CV/JD text, quotes, extracted phrases and profile-derived selections never fall back to an unapproved general unpaid model/embedding endpoint. No safe approved processor means manual entry or deterministic fallback. Approved processor = paid Gemini only (`GEMINI_TIER=paid` + key + `LLM_MODE=live`); otherwise the deterministic local engine handles personal tasks. Unpaid Gemini receives public, non-personal, offline reference data only ([architecture §12](architecture_astra.md)).
8. **Boundaries:** external data in [`lib/integrations/`](lib/integrations/); generative models in [`lib/llm/`](lib/llm/); embeddings in [`lib/embeddings/`](lib/embeddings/); Prisma in [`lib/db/`](lib/db/); pure math in [`lib/domain/`](lib/domain/); orchestration in [`lib/services/`](lib/services/).
9. **No live tests or demo dependency.** Tests block third-party traffic on server and browser. Persona browsing uses immutable snapshots/pure local calculations, never live providers/models. Fixture market facts must be lawful recorded responses.
10. **Honest learning estimates.** Complete gap/prerequisite workload drives Reach/plans/paths. Courses do not satisfy licensing or guarantee a job. Interest affinity is separate from the baseline score.
11. **Dark accessible UI only.** One token set; source/calculation/projection labels; loading/empty/error/unavailable/stale states; graph/list alternatives. No fabricated sample figures in production.
12. **Quality and ownership.** Strict types and Zod boundaries; no unsafe casts/suppression/skipped tests to force green. One writer per file, narrow debugger grants, actual integrated QA before completion.

## 4. Implementation stack

Node 24 LTS; Next.js 16.4.2 App Router (`proxy.ts`, not middleware) with pinned stable versions, TypeScript 6.0.3, Tailwind v4/shadcn/Lucide, React Flow/Recharts, PostgreSQL/Prisma 7.10.1 (`Unsupported("vector(768)")`, extensions in migration SQL)/pgvector/pg_trgm, guest sessions, in-memory parsing, AI SDK `ai@7.0.146` + `@ai-sdk/google@4.0.101` behind the `GEMINI_TIER` switch, gemini-embedding-001 (768-d, manual L2 normalization), a deterministic local extraction engine, Vitest/Playwright and offline TypeScript seed scripts.

The architecture intentionally does **not** require Clerk, blobs, Redis, Inngest, a runtime import worker or Common Crawl ingestion. Adding them is an architecture decision, not an instruction to fill an allegedly missing folder. Verify current provider limits, model availability and source counts in U00/U06.

## 5. Commands to establish during implementation

Establish these scripts in [`package.json`](package.json). U01 creates the core scripts; later units add their commands. Unimplemented commands must fail clearly rather than return a successful stub.

| Command | Purpose / owner |
|---|---|
| npm run dev | One coordinated local dev server |
| npm run typecheck | Strict compiler checks |
| npm run lint | ESLint boundaries plus token rules |
| npm run test:unit | Pure/isolated unit tests; no database needed |
| npm run test:integration | Isolated database integration; fail clearly if required setup absent |
| npm test | Unit + integration aggregate; no silent skipping |
| npm run build | Production build; never shares output with a running dev process |
| npm run test:e2e | Browser/server fixture mode with external network blocked |
| npm run check:docs | Document links, active tree/route/ownership consistency |
| npm run db:migrate | Development migration; backend, approved isolated target |
| npm run db:deploy | Apply reviewed migrations to approved target; never reset |
| npm run db:studio | Local authorized database inspection |
| npm run db:size | Measured storage/extension/index budget |
| npm run purge:stale -- --dry-run | Preview expired guest cleanup; live execution separately approved |
| npm run eval | Offline benchmark from frozen labels and real recorded synthetic captures |
| npm run eval:capture | Explicit opt-in live capture on synthetic CVs, with quota/privacy approval; never CI |

Seed order, on a developer/approved maintenance machine, not a request handler:

1. npm run seed:onet
2. npm run seed:lightcast
3. npm run seed:config
4. npm run seed:embed
5. npm run seed:map-software
6. npm run seed:resources, then npm run check:links
7. npm run seed:graph
8. npm run seed:macro
9. npm run seed:market -- --dry-run, then a separately approved budgeted live run
10. npm run seed:personas
11. P2: npm run seed:outlook, then refresh persona scenarios

Scripts map to the explicit entries in [`project-file-tree.md`](project-file-tree.md). Version/checkpoint logs must survive interrupted imports. Rebuild graph/scenarios after dependent catalog/source/model changes. Do not run live calls merely to test UI.

## 6. Environment contract

U01 records names and safe defaults in [`.env.example`](.env.example). Humans place secrets in ignored [`.env.local`](.env.local) and approved deployment settings; agents never print or copy values. Runtime/CLI environment loading must be explicit and compatible with the installed Prisma/tool versions.

| Variable name | Purpose / default policy |
|---|---|
| DATABASE_URL, DIRECT_URL | Pooled runtime and direct migration database targets |
| TEST_DATABASE_URL | Explicit isolated integration/E2E target; never production |
| SESSION_SECRET | HMAC secret for privacy-safe request limit keys |
| NEXT_PUBLIC_APP_URL | Public app origin; not a secret, validated for origin checks |
| DATA_MODE | live or fixtures; development/tests default fixtures |
| LLM_MODE | live or mock; tests default mock; mock is never real-user extraction |
| GEMINI_TIER | unpaid (default) or paid; paid unlocks personal tasks only with GEMINI_API_KEY and LLM_MODE=live |
| GEMINI_API_KEY | Unpaid key for offline public tasks; the owner adds a paid key before the event |
| PERSONAL_LLM_ENABLED | false; Groq is optional and unused in free demo mode |
| LLM_PERSONAL_PROVIDER, LLM_PERSONAL_MODEL | Approved personal processor/model; no automatic general fallback |
| GROQ_API_KEY | Candidate personal-provider secret if approved |
| LLM_GENERAL_MODEL | Generation model id (gemini-2.5-flash) from validated configuration |
| EMBEDDING_MODEL, EMBEDDING_DIM, EMBEDDING_TASK_TYPE | Pinned reference embedding identity; dimension 768 after capability check |
| ADZUNA_APP_ID, ADZUNA_APP_KEY | One team account; optional when data unavailable |
| ADZUNA_LIMIT_MINUTE, ADZUNA_LIMIT_DAY, ADZUNA_LIMIT_WEEK, ADZUNA_LIMIT_MONTH | Effective limits at or below verified account quota and application caps |
| LIGHTCAST_CLIENT_ID, LIGHTCAST_CLIENT_SECRET | Approved offline seed access only |
| CV_ANALYZE_DAILY_CAP | Verified quota-derived global analysis limit; fail closed if unsafe/missing in live mode |

Non-secret feature flags are lead-owned in [`lib/config/features.ts`](lib/config/features.ts); no unfinished feature defaults on. Additional provider credentials/settings require an approved contract and an environment-example update. No secret gets a public client prefix.

## 7. Verification and approval

Before a code unit is marked complete: typecheck, lint, aggregate tests and production build pass; affected E2E passes; relevant eval uses valid captures; I01–I18 audit and acceptance evidence are recorded; docs/tree/ownership agree. The sole pre-U03 bootstrap exception is defined in §9 of [`ai-workflow-rules_astra.md`](ai-workflow-rules_astra.md): eligible foundation work uses its available checks while the missing integration gate remains explicitly blocked, then U03/candidate integration verifies the full suite.

Stop affected work and ask the project owner before changing scope, formulas, prompt behavior, privacy/data sources or protected benchmark inputs; adding services/spending; resetting/deleting external data; publishing/deploying/submitting. Continue lawful fixture/domain work when missing keys do not block it.

**First action in the new application:** follow U00/U01 in the tracker. Do not build a different product, copy conflicting source instructions, create every planned file as an empty stub, or mark the complete roadmap done after scaffolding.
