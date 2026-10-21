# VectorPath — Progress tracker

## 1. Current state

- Completed units (verified): U01 (bootstrap exception; aggregate gate now closed); W01: U02, U03, U14, U18 (QA PASS 2026-10-21).
- U00: investigation recorded 2026-10-20 in [`docs/verification/providers.md`](docs/verification/providers.md) — status in review; blocked-human items listed there.
- U01: **verified under the bootstrap exception** 2026-10-20 — review rounds 1–4 ([`U01.md`](docs/agents/reviews/U01.md), [`U01-round3.md`](docs/agents/reviews/U01-round3.md), [`U01-round4.md`](docs/agents/reviews/U01-round4.md); round 4 APPROVED WITH NONBLOCKING NOTES). The aggregate gate is now closed: `npm test` exit 0 on the W01 integrated candidate (QA W01 §1: unit 341/341, integration 53/53 against the local disposable test DB).
- Current goal: W02 — U04 and U05 (backend), U06 (data) and U16 (domain), per tracker dependencies. U06 also needs the U00 O*NET dictionary/license check, which is still in review. The W02 plan is not yet on the board; the lead records it (playbook §6 Stage 0).
- Contract lock v1 (CONTRACT LOCKED 2026-10-21, [`board.md`](docs/agents/board.md)): types/scoring.ts `cf0918110921bf273e8360cc856e69c87c0c4e8397995d4f9e8a51d8e82fa364`; types/evidence.ts `550f7e1ab5bce192be752282e8b09fcb76e7438c63b251861f8adf7415968733`; types/provenance.ts `86f930358bb8d6c496f6e1986d56b172ab5d467bfa1f701dee6500c231216bf2`. Replaces the stale 2026-10-20 values.
- Current wave: W01 complete. QA PASS 2026-10-21 for U02, U03, U14 and U18 ([`docs/agents/qa/W01.md`](docs/agents/qa/W01.md)). Not dispatched: U32a (Q09 labeler approval open). Browser error/loading render and screen-reader checks are BLOCKED (QA §2).
- In progress: none. No W02 unit started.
- Schema lock: free, released by lead after QA PASS 2026-10-21 (lead instruction to scribe). Note: board.md's Locks section still reads "held … until QA PASS" and needs the lead's update. Active grants: backend U03-integration-harness (tests/integration, tests/setup/integration-*) expires 2026-10-22; QA takes over the harness at expiry (QA W01 §6). The lead U01 grants were scheduled to expire 2026-10-21T00:00Z (board.md).
- Submission deadline and submission format: unknown; project owner must confirm.
- Active blockers: none for W02 (owner sign-off 2026-10-20, D18–D24). Open defect: BUG-W01-001 (Medium, address minimization; reopened 2026-10-21, with vp-domain; **blocks U19b**). Closed: BUG-W01-002 and BUG-W01-003 (docs/agents/bugs). Owner decisions 2026-10-21: D25 (Q12) and D26 (Q13); Q14 closed. `axe-core` 4.14.0 is pinned as an exact devDependency by the lead (QA W01 §7.1 closed; scribe confirmed in package.json). Open lead request: decide the `db:migrate` wording (U03 R2-2). Data preconditions: free Lightcast and Adzuna registrations (human) before lawful samples exist; deadline date unrecorded (needed for U41).
- Session record 2026-10-20: lead; files per U01 handoff; gates typecheck/lint/test:unit/build/e2e/check:docs pass, npm test BLOCKED (no test DB, bootstrap exception); usage: no app provider calls; next action: restart Claude Code, spawn vp-reviewer for U01, then dispatch W01.
- Session record 2026-10-21 (scribe, W01 RECORDED): unit/wave W01 (U02, U03, U14, U18); revision: uncommitted working tree on `master`, no commits; files: the root docs and records listed in [`scribe-W01.md`](docs/agents/handoffs/scribe-W01.md); commands: none run by the scribe (no shell tool); QA-reported results in QA W01 §1 (typecheck 0, lint 0, npm test 0 with TEST_DATABASE_URL, build 0, test:e2e 38/38, check:docs 0, agents:audit 0, db:size 0 at 9.25 MB); decisions/approvals: none new; owner decisions 2026-10-21 recorded (D25, D26; Q12 and Q13 resolved; Q14 closed), axe-core 4.14.0 pinned by the lead; blockers as above; usage: none (no provider or model calls); schema lock: free; next action: lead records the W02 plan on the board, runs check:docs and agents:audit on this revision, and tracks the reopened BUG-W01-001 fix (vp-domain) as a blocker for U19b.

## 2. How to execute this roadmap

Priorities: P0 core, P1 mandatory differentiators, P2 full-product extensions; U39 accounts are conditional. Owners use the roles in [`claude-agents_astra.md`](claude-agents_astra.md). Size S/M/L is a planning estimate, not a completion promise. Split cross-boundary work into assigned sub-tasks; parent acceptance still requires integration.

Dependencies mean **accepted integrated outputs**, not merely that another agent started a file. A builder may prepare UI from locked contract fixtures earlier, but cannot mark the integrated feature done. U00 checks gate the specific live operation; blocked provider approval does not prevent U01 or pure/fixture implementation. For pre-U03 foundation work, apply only the explicit bootstrap verification exception in §9 of [`ai-workflow-rules_astra.md`](ai-workflow-rules_astra.md); missing integration setup remains a recorded blocker, never a passing aggregate test.

U19 is shorthand for U19a + U19b; U32 is shorthand for U32a + U32b. Neither shorthand is a separate completion checkbox. U33a/U33b/U33c are child assignments within U33 and retain its parent acceptance.

**Ready immediately:** U00 and U01. **Early parallel preparation after U01:** U02, U03, U14, U18 and U32a, with disjoint ownership. Freeze U32a labels before tuning against them.

Status vocabulary: pending, building, in review, blocked, verified, approved deferred. Keep unchecked boxes until verified. A deferred optional feature is not completed.

## 3. Foundation and reference data

- [ ] **U00 — Verify assumptions and operating permissions** · Lead + human · P0 · S
  - Dependencies: none.
  - Check: event deadline/format; supported Node/framework/SDK versions; O*NET dictionary/version/license; Lightcast storage/display permission; Adzuna aggregate/listing permission and quotas; World Bank series availability; model retention/free limits; hosting eligibility and regions.
  - Record official URLs, dates and scope in [`docs/verification/providers.md`](docs/verification/providers.md). Never label unresolved permissions assumed allowed.
  - Done when: the verification log explicitly marks each item verified, unavailable or blocked with an owner and next action. This closes the investigation unit, **not** any blocked live permission; release remains gated on those permissions or an approved unavailable-data behavior.

- [x] **U01 — Scaffold, contracts, tooling and agent setup** · Lead · P0 · M · verified 2026-10-20 (bootstrap exception; aggregate gate closed on the W01 candidate, QA W01 §1)
  - Dependencies: none; consult available U00 version checks before pinning dependencies.
  - Create root tooling/configuration per tree, strict TypeScript, lint boundaries, Vitest/Playwright setup, safe environment example and initial README. Register commands in the root entry document; future commands fail clearly until implemented.
  - Set up agent definitions/ownership only using verified installed Claude Code capabilities. Add documentation/token checks and fixture schemas. No broad shell-permission bypass.
  - Done when: dev serves a minimal page; typecheck/lint/sample unit test/build pass; intentional invalid import fails lint; docs checker validates document links and distinguishes planned application paths from existing files; applicable agent-lock probes pass or single-agent fallback is recorded.

- [x] **U02 — Dark tokens, fonts and shell** · Frontend · P0 · M · verified 2026-10-21 (QA W01 PASS)
  - Dependencies: U01.
  - Implement the sole UI palette, semantic mappings, local/system font fallback, sidebar/topbar/mobile navigation and shared loading/empty/error/unavailable states.
  - Done when: shell works at 375, 1024 and 1440 px, keyboard focus is visible, actual contrast checks are recorded and token lint catches invalid component colors.
  - Verified 2026-10-21 (QA W01 §2–3): 375/1024/1440 browser matrix passed (E2E 38/38, third-party network blocked); focus ring on every tabbed control; axe 0 violations on `/`, the 404 page and the open menu; palette-pair contrast in `contrast.test.ts`; token lint 14 files clean. BLOCKED, not verified: browser render of `app/error.tsx` and `app/loading.tsx`; screen-reader announcements. Contrast restrictions are recorded in [ui-context §2](ui-context_astra.md).

- [x] **U03 — Database and migrations** · Backend · P0 · M · verified 2026-10-21 (QA W01 PASS)
  - Dependencies: U01; verified database capability from U00 before external provisioning.
  - Add core/reference/operational schema, private cascade relationships, vector/trigram extensions, indexes, client and query boundaries. Coordinate QA-owned isolated test setup and integration configuration; later P2-specific migrations may extend the schema.
  - Done when: migrations apply to an isolated database, vector round-trip/nearest lookup passes, scope/cascade constraints work and npm run db:size reports measured size. The integration harness and aggregate tests pass, including regression checks over accepted bootstrap work. No real production reset.
  - Verified 2026-10-21 (QA W01 §3): harness `migrate deploy` on the loopback disposable DB after a server-side name check; vector round trip and HNSW nearest (100 rows); cascade/scope constraints (16 tests, exact constraint names); `db:size` 9.25 MB of 150 MB on the empty schema; `npm test` exit 0. Migration rule: Prisma must never drop `*_hnsw_idx`, `*_trgm_idx` or `*_partial_idx` (README). Follow-ups: `db:migrate` stays interactive-only (R2-2; lead decides the wording); verify Neon pgvector ≥0.8.0 before U27 (R2-3); re-measure size after the U06–U09 seeds. BUG-W01-003 (orphaned `migrate dev` process) is CLOSED: the lead stopped it 2026-10-21 (lead report, not re-inspected by the scribe).

- [ ] **U04 — Guest sessions and access** · Backend · P0 · M
  - Dependencies: U03.
  - Implement hashed guest tokens, session expiry/revocation, scoped capabilities, origin/CSRF checks, private cache policy and rate-limit primitives.
  - Done when: owner read/write succeeds; other guest, wrong child ID and expired session fail; demo read succeeds but all demo writes fail; cross-origin mutation test fails safely.

- [ ] **U05 — Cache and atomic provider budgets** · Backend · P0 · M
  - Dependencies: U03.
  - Implement dated cache outcomes, atomic multi-window reservation and private model-cache helpers/metadata logging.
  - Done when: concurrent tests never exceed configured effective caps, retries consume quota, stale fallback keeps its original date and personal cache keys cannot collide across profiles.

- [ ] **U06 — Verified O*NET importer** · Data · P0 · L
  - Dependencies: U03; relevant U00 dictionary/license check.
  - Inspect actual files/columns/scales. Import eligible occupations, requirements, titles, tasks, related roles, zones and available supporting facts. Store manifest/checksums/actual counts.
  - Done when: small recorded-source parser tests pass; complete permitted release import matches manifest counts; suppressed/unusable rows are accounted for; repeat run creates no duplicate records. No assumed exact occupation count.

- [ ] **U07 — Lightcast adapter and canonical aliases** · Data · P0 · M
  - Dependencies: U03; relevant U00 permission check before live download.
  - Implement validated token/client/mapper, lawful fixture mode, namespaced skill/alias upserts and typo candidate retrieval.
  - Done when: permitted data normalizes known aliases, ambiguous names remain candidates, repeat seed is idempotent and coverage/license status is visible. If full access is unavailable, the adapter may be verified on lawful samples, but the full-taxonomy milestone remains blocked and cannot be claimed.

- [ ] **U08 — Reference embeddings** · Data · P0 · L
  - Dependencies: U06, U07; approved model/dimension/privacy settings.
  - Implement resumable public-taxonomy embedding, normalized 768-dimensional vectors, file cache and candidate retrieval. No runtime personal phrase sent to general provider.
  - Done when: verified target rows have consistent vector manifests, interruption resumes without duplicate paid/quota calls, invalid vectors fail and personal-to-general routing tests reject unsafe input.

- [ ] **U09 — Software mapping and occupation graph** · Data · P0 · M
  - Dependencies: U08, U10, U14, U16.
  - Map software through exact/fuzzy/permitted reference-vector candidates; retain traceable permitted O*NET-derived skills. Build compact role requirements, neighbors and source-backed edges with canonical workload assumptions.
  - Done when: mapping coverage report and ten manually inspected occupations are recorded, ambiguous mappings remain reviewable, graph versions are stable, repeat run is idempotent and unreachable nodes are reported rather than forcibly connected.
  - Rebuild after U13 catalog completion and before persona snapshots.

- [ ] **U10 — Region/sector/green configuration and persona drafts** · Data · P0 · M
  - Dependencies: U06.
  - Populate BD/IN/GB/US mappings, source codes/currency/locale, documented sector overrides and real resolved green-target codes. Draft all four fictional personas for owner approval.
  - Done when: every scored occupation has a documented sector or explicit unknown; every enabled green target resolves; no fictitious occupational title masquerades as a taxonomy record; persona drafts contain no real person's data.

- [ ] **U11 — World Bank macro adapter** · Data · P1 · M
  - Dependencies: U05, U10; relevant U00 source checks.
  - Import WDI sector observations and verified available GEP forecasts, preserve periods/vintages, implement lawful fixtures and unavailable series.
  - Done when: country mappings and percent conversions are tested, missing forecasts do not become guesses and records carry actual source/fetch/observation metadata.

- [ ] **U12 — Adzuna market adapter and seed** · Data · P0 · M
  - Dependencies: U05, U06, U10; permissions gate live/public use.
  - Implement IN/GB/US query stats/listings, atomic quota use, dry-run priority queue, resumable seed and lawful recorded fixtures. BD always reports unsupported postings.
  - Done when: adapter cases include quota exhaustion/429/missing region/stale/terms blocked; seed counts stay within caps; stats distinguish mean/median and query counts. Live checks blocked by terms remain explicitly blocked, not excused by fixtures.

- [ ] **U13 — Free catalog and reviewed prerequisites** · Data · P0 · L
  - Dependencies: U07, U10.
  - Curate useful resources for persona/green targets, verify specific free access and link health, record hours/source/language/certificate restrictions, reviewed prerequisite DAG and generic project templates.
  - Done when: every chosen catalog entry has verification metadata, SSRF-safe link-check tests pass, manual prerequisite cycles are rejected, uncovered requirements have honest search/default-hour fallbacks. Rebuild U09 graph with the finalized catalog; verify full persona coverage during U25.

## 4. Core domain, intake and services

- [x] **U14 — Versioned scoring domain** · Domain · P0 · M · verified 2026-10-21 (QA W01 PASS)
  - Dependencies: U01 and locked scoring contracts.
  - Implement normalized requirements, coverage/states, Fit, workload-based Reach, Demand availability logic, Opportunity, ties and diversity. Domain functions may accept resource assignments prepared by U16; no dependency on runtime ingestion.
  - Done when: architecture formulas and worked examples pass; no-occupation/no-software/missing-zone/zero-count/tied-cohort cases pass; no I/O or rounding before display. Initial baseline constants are astra-v1; tuning waits for U32a.
  - Verified 2026-10-21 (QA W01 §3): formula and worked-example tests run inside the 341 unit tests. QA probe: `opportunityScore(1,1,1)` = 100; a zero component gives 0; ranking identical across 50 input permutations; at most 3 per minor group with labelled relaxation; held roles listed separately; ranks unique. Baseline `astra-v1`, untuned. F3 dedup rule resolved 2026-10-21 (owner, D25; §9 Q12). Domain-local types (ranked output, unscorable, held roles, inputs) are PROVISIONAL until the U15 contract locks them (R3-2).

- [ ] **U15 — Match and role-read services** · Backend · P0 · M
  - Dependencies: U04, U09, U12, U14.
  - Read reference versions, compute owner-scoped match runs, preserve breakdowns, enforce revision/country keys, separate held roles and provide public demo read interfaces.
  - Done when: same inputs produce identical rankings; stale in-flight revisions cannot overwrite new results; reference scoring is benchmarked locally with environment/size recorded; no live provider required for a cached/fixture match.

- [ ] **U16 — Complete gap/workload/plan domain** · Domain · P0 · M
  - Dependencies: U14.
  - Implement all-gap/prerequisite closure, unique-resource workload, uncovered estimates, topological ordering, cycle policy, phase segmentation and date arithmetic. Export the shared workload contract used by Reach and graph-building.
  - Done when: one resource serving several gaps is counted once; all gaps remain in total hours despite first-twelve display; manual cycle errors, empty catalog, oversized resource and weekly-hours tests pass.

- [ ] **U17 — LLM routing, tasks and grounding** · Domain · P0 · M
  - Dependencies: U05; relevant U00 approval before live personal calls.
  - Task registry, verified SDK adapter, personal/general routing, versioned prompts/schemas, deadline/retry budget, typed fallbacks and mock mode.
  - Done when: personal/general prohibition and citation-support tests pass; no model output supplies scores/market facts/URLs; live-disabled extraction returns manual fallback; telemetry excludes content.

- [x] **U18 — Redaction and evidence domain** · Domain · P0 · M · verified 2026-10-21 (QA W01 PASS; open BUG-W01-001 Medium blocks U19b)
  - Dependencies: U01.
  - Minimize contact details, preserve normalized-to-original quote offsets, distinguish extracted/inferred/manual provenance and enforce text limits.
  - Done when: BD/international phone and quote-normalization edge cases pass; exact evidence offsets point into persisted minimized text; redaction is never described as complete anonymization.
  - Verified 2026-10-21 (QA W01 §3) against the written Done-when: phone and quote edge probes pass; offsets point into persisted minimized text; redaction is described as minimization only.
  - **Open, must close before U19b:** BUG-W01-001 (Medium, reopened 2026-10-21; with vp-domain as an in-scope U18 privacy defect): GB/US/IN address forms, including the multi-line CV header, are not minimized. BUG-W01-002 (Low; labelled 7–8-digit local numbers kept) is CLOSED 2026-10-21. Accepted trade-off: 9–15-digit separated runs (some IDs) are redacted, so a quote over them cannot verify. Q14 is closed (§9).

- [ ] **U19a — Extraction and normalization contract** · Domain · P0 · M
  - Dependencies: U17, U18, U08.
  - Versioned CV prompt/schema, known descriptor constraints, local/permitted candidate mapping, verified quotes and confirmation-ready output. Generic model never embeds personal phrases.
  - Done when: synthetic good/adversarial examples produce validated review candidates; unverifiable items are dropped and counted; unresolved mapping is explicit; manual fallback is not a fake successful extraction.

- [ ] **U19b — Bounded CV pipeline and privacy services** · Backend · P0 · L
  - Dependencies: U04, U15, U19a.
  - Bounded parsers, consent, upload/stage/status endpoints, idempotency, owner revision checks, cancellation, JSON export, session revocation and cascade deletion/retention enforcement.
  - Done when: a synthetic upload produces reviewable state under the documented deadline; model failure allows manual entry; ZIP/PDF/size tests pass; duplicate/revoked-session/delete-during-analysis tests pass; no raw bytes persist.

## 5. P0 user journey and deployment milestone

- [ ] **U20 — Intake/manual-entry UI** · Frontend + backend actions · P0 · M
  - Dependencies: U02, U19b.
  - Consent, file controls, actual-stage stream UI, interruption recovery and manual profile form.
  - Done when: fixture E2E covers upload and no-model manual flow to review, including oversize/type/rate-limit errors and accessible progress.

- [ ] **U21 — Skills review and preferences** · Frontend + backend actions · P0 · M
  - Dependencies: U20.
  - Evidence table, accept/remove inferred items, manual skills, mapping candidates, country/hours preferences and explicit confirmation before final matching.
  - Done when: lower proficiency override persists without inference restoring it; edits invalidate runs; demos cannot be mutated; keyboard-only flow passes.

- [ ] **U22 — Ranked opportunities** · Frontend · P0 · M
  - Dependencies: U15, U21.
  - Ranked rows, three-factor strip, support confidence, filters, calculation/source notes and held-role section.
  - Done when: eligible profiles show ten diverse recommendations or an explained shortage; empty/weak profile has no fabricated covered skills; all unavailable/stale states are rendered.

- [ ] **U23 — Role detail and jobs** · Frontend + backend/domain subtasks · P0 · L
  - Dependencies: U16, U17, U22.
  - Grounded/template explanation, complete gap matrix, demand/listing panels, verified typical education where available and explicit preparation caveats.
  - Done when: provider unavailable does not break role detail; BD has no invented jobs/salary; quote/source references resolve; unsupported claims fall back to deterministic copy.

- [ ] **U24 — Learning plan service and UI** · Backend + frontend subtasks · P0 · L
  - Dependencies: U13, U16, U23.
  - Complete plan persistence, prerequisites/resources, estimated learning completion, generic suggested projects, stable progress and hours changes.
  - Done when: cached core plan renders within ten seconds, schedule respects weekly capacity, uncovered gaps remain visible, progress survives regeneration appropriately and no date promises hiring readiness.

- [ ] **U25 — Immutable persona scenarios** · Data + backend/frontend subtasks · P0 · M
  - Dependencies: U10, U19b, U24.
  - Seed approved fictional CVs, all supported country scenario rankings, top-five plans/explanations and lawful listing snapshots; deterministic/unavailable detail outside precomputed coverage.
  - Done when: four personas work in at most two landing clicks with browser/server external network blocked; demo country switching changes scenario without writes; no live model/provider fallback. P1/P2 snapshot refreshes are required when those features land.

- [ ] **U26 — Methodology/privacy/export/deletion UI** · Frontend + backend · P0 · M
  - Dependencies: U19b, U22.
  - Sources/attribution/formulas/limitations, honest Not evaluated yet until U32b, consent/storage/retention information, owner JSON export and delete confirmation.
  - Done when: export omits secrets/other owners, deletion E2E verifies private-cache cascades and unrelated data preservation, and terms/attribution copy matches verified permissions.

- [ ] **U27 — P0 deployment checkpoint** · Lead + QA + human · P0 · M
  - Dependencies: U25, U26 and deployment/privacy/provider permissions from U00.
  - Approve target, deploy within verified free limits, migrate/seed without reset, configure allowed origin/secure cookies and run production persona smoke tests.
  - Done when: deployed core works with legal data and approved processing, four gates/E2E pass, rollback/runbook and retention scheduling status are recorded. **M1: P0 core live**, not the full product complete.

## 6. Mandatory P1 differentiators

- [ ] **U28 — Non-linear path domain and service** · Domain + backend · P1 · L
  - Dependencies: U09, U15, U16.
  - Bounded k-shortest simple paths, real user first hop, reference-role later hops, green targets, effort/cost distinction and explicit no-route state.
  - Done when: toy-graph optimum/cycle/bounds tests pass; curated technician has three distinct green-target routes, at least one multi-hop non-linear path, with all assumptions/evidence visible.

- [ ] **U29 — Path explorer and skills graph** · Frontend · P1 · L
  - Dependencies: U21, U25, U28.
  - Transit map/list, station/edge inspector, green lens, selected skills/roles/resource graph and responsive accessibility. Coordinate persona snapshot refresh with data owner.
  - Done when: graph/list show equivalent information, all interactions are keyboard-operable, reduced motion works and refreshed persona paths/graphs need no live external calls.

- [ ] **U30 — Regional demand integration** · Domain + backend · P1 · M
  - Dependencies: U11, U15.
  - Wire full sector/forecast inputs and age/confidence rules into versioned match scenarios without changing the specified formula. Refresh all affected match/persona snapshots.
  - Done when: percent/vintage/absence cases pass; BD/GB frozen scenario shows expected input/ranking differences; unchanged data is allowed unchanged ordering; badges identify proxies and priors.

- [ ] **U31 — Market pulse** · Frontend + backend · P1 · M
  - Dependencies: U30.
  - Country table, sector chart, actual versus forecast distinction, coverage and source/age metadata.
  - Done when: all four countries render honestly, forecast absence is visible, charts have table/text alternatives and no US salary is labeled Bangladeshi.

- [ ] **U32a — Freeze independent evaluation inputs** · QA + human · P1 preparation · M
  - Dependencies: U01.
  - Twenty fictional CVs, graded relevant roles, gold canonical skills, tuning/holdout split, dataset manifest and labeler independence declaration.
  - Done when: owner approves and freezes versioned labels/split before tuning; source IDs resolve against the chosen taxonomy; no real CV or label leakage to the tuner.

- [ ] **U32b — Benchmark captures, offline harness and methodology results** · QA + domain/frontend subtasks · P1 · M
  - Dependencies: U32a, U19b, U30.
  - BM25/metric functions, opt-in synthetic live capture with approvals, offline reproducible evaluation and in-app results. Never run live capture in automated tests.
  - Done when: actual result files record snapshot/model/prompt/scoring versions; ranking/extraction metrics and baseline parity are independently checked; methodology shows real values, including missed targets and limitations. Extraction unavailable without real captures remains a release blocker for accuracy claims.

- [ ] **U33 — Specific-job comparison and plan** · Cross-boundary subtasks · P1 · L
  - Dependencies: U19a, U24.
  - U33a Domain: evidenced JD extraction/candidate requirements and gap contract. U33b Backend: owner JD/requirement persistence, target-aware plan service and actions. U33c Frontend: paste/review/gap/plan UI. These are scoped child tasks, not independent parent completion boxes.
  - Done when: A08 passes, including malicious instruction text, unresolved requirements, no URL fetch, labeled proficiency assumptions, target-specific plan and cascade deletion coverage.

**M2: mandatory P1 complete** only after M1 and U11 plus U28–U33 (both U32 parts) are verified, personas refreshed and the full relevant E2E suite passes. P1 implementation may proceed while deployment is blocked, but the full M2 milestone and P2 start still require the accepted P0 checkpoint. Typical education is implemented with U06/U23, not a missing separate unit.

## 7. Full-product P2 extensions

- [ ] **U34 — Cited future outlook** · Domain + data/backend/frontend · P2 · M
  - Dependencies: M2; verified source usage.
  - Bounded licensed-fact retrieval, public-role projection generation, cached scenario and UI. A curated local public-news corpus is owner-approved (architecture §12.5); bulk Common Crawl remains out of scope.
  - Done when: horizon/confidence/citations are visible, unsupported historical trends/automation percentages fail validation, missing evidence gives unavailable state and refreshed persona outlooks make no live calls.

- [ ] **U35 — Optional RIASEC check** · Domain + backend/frontend · P2 · M
  - Dependencies: M2; verified activity-item permission and source profiles.
  - Twelve activities, two per dimension, deterministic normalization/cosine, opt-out and owner persistence. No Opportunity-weight change.
  - Done when: six dimensions/zero-vector cases tested; results say not validated; skipping leaves ranking unchanged; export/deletion includes responses.

- [ ] **U36 — Grounded advisor** · Domain + backend/frontend · P2 · L
  - Dependencies: M2, U17 and approved personal processor.
  - Authorized read-only tools, validated fact/citation output, limited history/token budget, rate limits and grounded streaming/buffering.
  - Done when: prompt-injection/IDOR/provider-failure tests pass; unsupported facts are declined before display; no tool can fetch arbitrary URLs or mutate profiles; demo advisor uses prepared examples or unavailable state, not live calls.

- [ ] **U37 — Remote suitability proxy** · Data + domain/frontend · P2 · S
  - Dependencies: M2; available verified work-context fields from U06.
  - Reviewed occupation-level rule, source/version and limitations; no invented remote job inventory or score-weight changes.
  - Done when: source missing yields unavailable, every indicator says proxy and no country coverage is implied.

- [ ] **U38 — Plan Markdown/print export** · Frontend + backend · P2 · S
  - Dependencies: M2, U24, U26, U33.
  - Owner-authorized role/JD plan export, print layout, source dates, assumptions and progress selection.
  - Done when: both target kinds export correctly, private responses are no-store and other-owner plan IDs fail.

- [ ] **U39 — Accounts feasibility and optional implementation** · Lead + backend + human · Conditional P2 · M
  - Dependencies: M2, U26 and explicit owner approval of provider/domain/free feasibility.
  - Do not assume an owned domain is required or available; verify the selected provider's current constraints. Before implementing, approve account/guest claim, ownership migration, sign-out, recovery, deletion and new file-tree routes.
  - Done when enabled: authorized guest-to-account claim is atomic, cross-device access works, no account takeover/IDOR, export/deletion preserved and tests pass. If not approved/feasible: record approved deferred; retain guest model and leave this checkbox unchecked.

## 8. Hardening and submission

- [ ] **U40 — Integrated hardening** · QA + scoped debugger · P0 release gate · L
  - Dependencies: M2, U27, U34–U38 verified or explicitly owner-approved deferred; U39 disposition recorded.
  - Full gates/E2E, I01–I18 audit, prompt/privacy abuse tests, upload/SSRF limits, retention/backup caveats, export/delete race tests, accessibility/responsive/projector checks and documented cold/warm latency sample.
  - Done when: release candidate passes all applicable acceptance, no critical unresolved issue, no hidden live demo dependency, usage/terms checks current and actual latency/quality limits are reported.

- [ ] **U41 — Submission package** · Scribe + lead + human · P0 release gate · M
  - Dependencies: U40 and confirmed event requirements.
  - Final README/setup/seed order/terms, walkthrough, pitch, screenshots/video, limitations and benchmark evidence; no fabricated achievements.
  - Done when: checklist below is verified and the human approves the exact artifacts and destination. Submission/publication is a separate approved action, not automatic.

## 9. Open questions and safe defaults

**Owner resolution 2026-10-20 (free demo mode, architecture §12):** Q02 (scope unchanged), Q04, Q05, Q06, Q08 and Q11 are resolved — no unit is blocked on them. Q04/Q05 keep a *data precondition*: a free Lightcast/Adzuna registration by a human before lawful samples can be recorded; until then those features show unavailable. Q01: non-commercial buildfest confirmed; the deadline date and submission destination are still unrecorded and needed only for U41. Q03/Q07 continue as normal inspection inside U06/U11. Q09 (persona and labeler approval) and Q10 (purge operator) remain open and are asked at U25/U32a and U27.

| ID | Question / owner | Blocks | Safe behavior until resolved |
|---|---|---|---|
| Q01 | Human: deadline, submission format, reviewers, team and pre-event-code rules | Scheduling/U41 | Build small verified units; do not invent a date or submission destination |
| Q02 | Human: confirm VectorPath, BD/IN/GB/US and fictional persona scope | Renaming/expansion only | Use current documented defaults |
| Q03 | Data/human: verified O*NET release, columns, scales and license | Live U06 import | Dictionary/sample inspection; no hard-coded 923/zone count |
| Q04 | Human/data: Lightcast access/storage/redistribution permission | Full live U07 | Lawful minimal sample or unavailable; no copied unlicensed taxonomy |
| Q05 | Human/data: Adzuna public counts/means/listings/retention permission and effective caps | Live/public U12, U27 | Suppress disallowed data, retain legal unavailable state |
| Q06 | Human/domain: personal processor retention, region, model, quotas and consent | Live U17/U19/U36 | Manual entry and synthetic mocks only |
| Q07 | Data: current WDI/GEP series and forecast vintage availability | Live U11 | Observed permitted data only; absent forecast remains absent |
| Q08 | Human/lead: free hosting/database terms, limits and region | U03 external setup/U27 | Local isolated development; no paid plan |
| Q09 | Human: approve personas, independent labeler and catalog reviewer | U25/U32a | Draft synthetic inputs, do not tune frozen eval on own labels |
| Q10 | Human/backend: retention policy and actual daily purge operator/scheduler | Public privacy claim/U27 | Enforce expiry on reads; state physical cleanup not yet configured |
| Q11 | Human: optional account provider/free feasibility | U39 only | Guest sessions; no login requirement |
| Q12 | Owner: F3 dedup rule. Options: (a) keep the strongest-weight row's weight and the highest required level, as implemented (lead recommendation, consistent with the §7.3 prerequisite rule); (b) take the required level from the strongest-weight row only | U14 decision record (architecture §7.1) | RESOLVED 2026-10-21: owner approved option (a) (D25). Implemented; architecture §7.1 updated |
| Q13 | Owner: confirm quote matching as a §6.2 clarification. Implemented: NFC per grapheme cluster on top of the whitespace/quote/dash normalization; matching stays case-sensitive | U18 quote verification (I08) | RESOLVED 2026-10-21: owner approved (D26). Implemented; architecture §6.2 updated |
| Q14 | Owner: direction for BUG-W01-001 (GB/US/IN address minimization) and BUG-W01-002 (labelled short phone numbers). Both bug records give options that change redaction behavior | U19b real uploads (BUG-W01-001 first) | CLOSED 2026-10-21: lead routed both to vp-domain as in-scope U18 privacy defects. BUG-W01-002 CLOSED; BUG-W01-001 reopened, with vp-domain, blocks U19b. Redaction stays minimization, never anonymization |

## 10. Architecture decisions

| ID | Decision and reason |
|---|---|
| D01 | Keep the instruction documents at the repository root. Use one authoritative file tree, one tracker and consistent relative links. |
| D02 | Guest-first with immutable public demos; no development auth bypass. Lowest friction without weakening isolation. |
| D03 | Free-tier, bounded requests and offline imports; no queue/blob/Redis requirement. Avoids unnecessary services and upload persistence. |
| D04 | One Fit/Reach/Demand formula, normalized inputs and versioned constants. Never placement probability. |
| D05 | One all-gap/prerequisite workload estimator for Reach/plans/paths, shared-resource deduplication, learning completion not hiring readiness. |
| D06 | BD first-class; remote is a preference. Missing local job/salary evidence stays unavailable. |
| D07 | Personal-safe routing includes redacted text, extracted phrases and profile-derived selections. General models only public reference tasks. |
| D08 | Evidence-verified extraction, user confirmation, separate occupation inference and manual self-report. |
| D09 | Production fixtures require lawful real provenance; synthetic people/test cases do not authorize invented market facts. |
| D10 | Include interactive skills graphs, pasted-JD gap/plan comparison, JSON export, precomputed guest demos and benchmark evaluation. |
| D11 | One dark transit-wayfinding design; explicit source versus calculation versus projection presentation. |
| D12 | Optional RIASEC only, separate affinity; no Big Five inference or unspecified score factor. |
| D13 | Cited qualitative future outlook, no unsupported automation percentages or bulk Common Crawl ingestion; a curated local public-news corpus is approved (D21). |
| D14 | Verify current versions, quotas and terms against official documentation before live use. |
| D15 | Agent hooks are tested guardrails, not a sandbox; no silent unknown-role allow, blanket permissions or repository-wide debugger grant. |
| D16 | Freeze eval early, separate real-provider captures from offline tests, report actual baseline deltas. |
| D17 | Revoke/expire sessions, owner-scope children and private caches, preserve deletion under in-flight work. |
| D18 | 2026-10-20 owner: non-commercial buildfest demo at $0; all units unblocked (architecture §12). |
| D19 | GEMINI_TIER unpaid (default) / paid switch; unpaid Gemini only for offline public tasks at ≤10 RPM; paid Gemini is the only personal model, enabled by configuration alone; Groq disabled. |
| D20 | Deterministic local engine (dictionary/n-gram matching with exact spans + templates) handles personal tasks without a paid model. |
| D21 | gemini-embedding-001 768-d SEMANTIC_SIMILARITY with manual L2 normalization; committed precomputed reference vectors; separate local-hash-ngram-v1 fallback identity, never mixed. Curated local public-news corpus approved for outlook. |
| D22 | Pins: Node 24, next@16.4.2 (proxy.ts), prisma/@prisma/client@7.10.1 with Unsupported("vector(768)") and extensions in migration SQL, ai@7.0.146 + @ai-sdk/google@4.0.101, TypeScript 6.0.3, ESLint 9, dotenv for prisma.config.ts. |
| D23 | Infrastructure: Docker pgvector locally, Neon Free Singapore and Vercel Hobby sin1 for deployment; seeded vectors + indexes ≤150 MB; uploads parsed in memory only; no Inngest/queue. |
| D24 | Adzuna caps 20/minute and 200/day; Adzuna and Adzuna Jobsworth attribution; BD unavailable message; World Bank null-series messages and GEP post-2025 Projections labels. |
| D25 | 2026-10-21 owner: requirement dedup by canonical ID keeps the highest weight and the highest required level, possibly from different source rows, consistent with the §7.3 prerequisite rule (architecture §7.1). |
| D26 | 2026-10-21 owner: quote verification applies Unicode NFC per grapheme cluster to the quote and the persisted text, in addition to whitespace/quote/dash normalization; spans never split a grapheme; matching stays case-sensitive (architecture §6.2). |

## 11. Submission checklist

- [ ] Required P0/P1 and approved P2 scope verified; all deferrals explicit.
- [ ] Product name centralized; event topic not used as product name.
- [ ] Actual source permissions/attributions and model privacy terms documented.
- [ ] Four persona scenarios work without live third-party access; DB dependency disclosed.
- [ ] Extraction/ranking results are real, reproducible and compared fairly with BM25.
- [ ] Manual-entry/no-model and no-market fallback paths work.
- [ ] Export/deletion/expiry/retention behavior tested and described accurately.
- [ ] All required code, E2E, accessibility and documentation checks pass on candidate revision.
- [ ] Setup, migration, seed order, safe environment names and rollback/runbook documented.
- [ ] No secrets, real CVs or unauthorized datasets in repository/artifacts.
- [ ] Review walkthrough rehearsed and cold-start/quota readiness checked.
- [ ] Human approves final artifacts and submission destination.

## 12. Walkthrough outline

Problem → technician demo → explanation/evidence → full gap/plan and hours adjustment → green path/list → teacher GB versus BD coverage → pasted-job comparison if time → actual benchmark/methodology → privacy/export/delete → enabled outlook/interests/advisor. Emphasize modeled routes and learning estimates, not guaranteed outcomes. Lead with precomputed personas rather than risking live extraction during the main demonstration.

## 13. Execution records

**Usage log:** record date, provider, operation, request/token counts, effective quota and remaining budget; use unknown when a count cannot be measured.

**Future session record fields:** date; unit/wave; revision; files; actual commands/results; decisions and approvals; blockers; usage; schema lock; exact next action. Empty fields must say not run/unknown/none as appropriate, never contain invented evidence.
