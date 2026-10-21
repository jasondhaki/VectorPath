# Handoff — U14 Versioned scoring domain (vp-domain)

Date: 2026-10-21. Revision: uncommitted working tree (no commits authorised). Wave W01.

## Summary

Pure, synchronous implementation of architecture §7.1–§7.5 under `lib/domain/scoring/`: requirement normalization and dedup, user-level helpers, coverage/states, Fit (with alpha), Reach (consumes a U16 `WorkloadBreakdown`; does not build one), Demand (percentile cohort, sector macro + forecast, support labels, neutral prior), Opportunity, base ordering, filters, held roles and minor-group diversity with labelled relaxation. All components stay full precision in [0,1]; nothing is rounded. No clock/random/env/network/fs — the "as of" date is injected into Demand.

## Acceptance (copied)

> Implement normalized requirements, coverage/states, Fit, workload-based Reach, Demand availability logic, Opportunity, ties and diversity. Domain functions may accept resource assignments prepared by U16; no dependency on runtime ingestion.
> Done when: architecture formulas and worked examples pass; no-occupation/no-software/missing-zone/zero-count/tied-cohort cases pass; no I/O or rounding before display. Initial baseline constants are astra-v1; tuning waits for U32a.

| Criterion | Covering test (`tests/unit/domain/scoring/`) |
|---|---|
| Worked example 1 (Fit 1, W 0, zone 0, Demand 1 → 100) | scoring.test.ts "Fit=1, W=0 …" |
| Worked example 2 / locked `scoring.example.json` | scoring.test.ts "reproduces the locked scoring.example.json vector" — whole `OpportunityResult` equals the fixture; opportunity matches to 12 dp (fixture literal is 1 ulp from IEEE evaluation of the formula) |
| no-occupation | scoring.test.ts alpha 0.30 without confirmed prior role; Reach unknown-zone case |
| no-software | scoring.test.ts "uses descriptors only …" (fitTools null, alpha null) |
| missing zone | scoring.test.ts "treats a missing or mismatched zone as unknown with zero penalty" |
| zero count | demand-rank.test.ts "treats a recorded zero as data", "P only … zero-count role" |
| tied cohort | demand-rank.test.ts "splits ties at half weight" ; exact Opportunity tie ordering |
| insufficient cohort / missing ≠ zero | demand-rank.test.ts "missing counts are not zero …" |
| unscorable role | scoring.test.ts buildRoleRequirements / scoreRole unscorable |
| diversity + relaxation, held roles, filters | demand-rank.test.ts §7.5 diversity block |
| No I/O | ESLint domain boundary block passes on `lib/domain` (bans clock/random/fs/net/env) |

## Changed paths

- `lib/domain/scoring/weights.ts` — `SCORING_VERSION = "astra-v1"`, all §7 constants, `clamp01`.
- `lib/domain/scoring/requirements.ts` — §7.1 (new file, not in tree; see below).
- `lib/domain/scoring/coverage.ts`, `fit.ts`, `reach.ts`, `demand.ts`, `opportunity.ts`, `rank.ts`.
- `tests/unit/domain/scoring/scoring.test.ts`, `tests/unit/domain/scoring/demand-rank.test.ts`.
- `docs/agents/handoffs/domain-U14.md` (this record).

## Contract revision consumed (unchanged)

types/scoring.ts `cf091811…`, types/provenance.ts `86f93035…`, tests/fixtures/contracts/scoring.example.json `b58e4ec3…` (hashes re-verified with sha256sum before work).

**PROVISIONAL (lead decision R3-2):** `ScoreRoleOutcome` (opportunity.ts), `RoleRequirementSet` (requirements.ts), `FitOutcome` (fit.ts), `RankCandidate` / `RankFilters` / `RankedRole` / `RankOutput` (rank.ts), plus the input shapes `DescriptorRow`, `SoftwareRow`, `PreparationZone`, `MarketSnapshot`, `SectorObservation`, `DemandInput` are domain-local and provisional until U15 locks the service DTO.

## Decisions and assumptions (within contract; reviewer please check)

1. Dedup keeps the strongest weight and all source refs (spec) and the **highest required level** (spec silent; mirrors §7.3 prerequisite rule). Output sorted by canonical ID.
2. Neighbor edges count in either direction; ties choose the lowest neighbor ID. `neighborVia` null when no credit.
3. Unknown years for an inferred descriptor → level 0 ("no time-derived credit").
4. Reach takes W from the workload and throws if `weeks ≠ totalHours/weeklyHours`; zones must share a `scaleId`, otherwise unknown (zero penalty, `zoneKnown:false`). Non-integer zones throw.
5. Demand: snapshots >30 days or in the future are not inputs; null counts are excluded (never zero); `cohortSize` discloses the eligible N even when <10; `snapshotIds`/`snapshotDate` are set only when P exists. Sector observations: non-null, ≤5 years before as-of year, latest three by year; duplicate years throw. Forecast requires sector data (no M → no forecast). Comparability/data-version selection of the cohort is the caller's (U15) job.
6. Ranking: held = ≥1 confirmed year (`WEIGHTS.heldRoleMinYears`), listed separately and excluded from top ten; filters apply before diversity; a sector filter excludes unknown-sector roles; relaxation only when the cap (not the candidate count) is the reason; ranked list = diversified top ten in base order, then the rest in base order.

## Commands (2026-10-21)

| Command | Exit | Result |
|---|---|---|
| `npx vitest run --project unit tests/unit/domain` | 0 | 2 files, 46 tests passed |
| `npm run test:unit` | 0 | 11 files, 215 tests passed |
| `npx eslint --max-warnings 0 lib/domain tests/unit/domain` | 0 | clean |
| `npm run lint` | 1 | **not mine**: all errors are in `lib/db/generated/**` (backend U03 Prisma client in progress, not lint-ignored); no other file reported |
| `npm run typecheck` | 2 | **not mine**: single error `tests/unit/components/shell.test.ts(58,31)` (frontend U02 in progress); no error in `lib/domain` or `tests/unit/domain` |
| Rerun at U18 handoff: `npm run typecheck` / `npm run lint` | 0 / 0 | both clean once U02/U03 settled; `npm run test:unit` 263/264 — only failure is the lead-owned `boundaries.test.ts` ESLint cold-start timeout (see domain-U18.md) |
| `npm test` | not run | aggregate blocked until U03 test DB (bootstrap exception) |
| build / E2E | not run | not assigned |

## Limitations / blockers

- Full typecheck/lint gates currently red from other in-flight units (above); lead to rerun once U02/U03 settle (suggest `lib/db/generated/**` in ESLint ignores — lead-owned config).
- Constants are baseline astra-v1, untuned (U32a not frozen).
- Software-neighbor kind is not checked (neighbors table is software-only by construction, §5).

## Invariants touched

- I02/I03: single formula source, pure/deterministic, input-order independent (rank test), breakdowns returned.
- I04/I11: missing market data stays null/neutral prior with `noMarketData`; zero is data; no invented facts.
- I14: Reach consumes the canonical workload contract only.

## Doc/tree updates requested (scribe)

- project-file-tree.md: add `lib/domain/scoring/requirements.ts` — §7.1 requirement normalization/dedup and user-level helpers.
- Record astra-v1 baseline constants as implemented (`lib/domain/scoring/weights.ts`).

## External usage

None.

## Review fixes (review docs/agents/reviews/U14.md, APPROVED WITH NONBLOCKING NOTES) — 2026-10-21

| # | Fix | Regression test |
|---|---|---|
| F1 | `computeFit` parses each requirement with `ScoredRequirementSchema` and throws RangeError on duplicate IDs. | scoring.test.ts "F1: rejects duplicate requirement IDs" |
| F2 | `computeDemand` throws on a duplicate SOC in the eligible cohort. It also throws when a non-empty cohort lacks the role's own eligible snapshot. An empty cohort means only the role's listing is known, so P is unavailable and nothing is thrown. That empty-cohort rule is my reading of "P is unavailable even if a single listing exists". | demand-rank.test.ts "F2: …" |
| F3 | Unchanged, per lead (decision record pending). | — |
| F4 | `PROVISIONAL (R3-2, until U15 lock)` doc comment added on every domain-local type: SourceScale, DescriptorRow, SoftwareRow, RoleRequirementSet, FitInput, FitOutcome, PreparationZone, ReachInput, MarketSnapshot, SectorObservation, DemandInput, ScoreRoleInput, ScoreRoleOutcome, RankCandidate, RankFilters, RankedRole, RankOutput. | grep |
| F5 | Added (a)+(b) similarity exactly 0.80 with partial proficiency giving 0.24; (c) 7 days High, 8 days Medium; (d) 5+1 candidates gives relaxedSlots 2; (e) future snapshot, future role and future sector year excluded; (f) duplicate sector year throws; (g) forecast without sector data leaves M null; (h) mixed-age cohort gives N 10 and stale IDs absent; (i) two evidences give alpha 0.30. | "U14 review fixes" blocks in both test files |
| F6 | The domain now guards its inputs and throws early. User level must be in [0,1]; q must be in (0,1]; similarity in [0,1]; market count must be a finite number ≥0 or null; snapshot dates must be valid; requirements go through Zod in Fit. | scoring.test.ts "F6", demand-rank.test.ts "F6" |
| F7/F8/F9 | Notes for U15/U22/scribe. No domain change. | — |
| F10 | Changed to the literal `2 / 3`. | demand-rank.test.ts |

Changed paths (this round): `lib/domain/scoring/{coverage,fit,demand,reach,requirements,opportunity,rank}.ts`, `tests/unit/domain/scoring/{scoring,demand-rank}.test.ts`, this record.

| Command | Exit | Result |
|---|---|---|
| `npx vitest run --project unit tests/unit/domain` | 0 | 135 passed (U14 + U18) |
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm run test:unit` | 0 | 315 passed |
| `npm run agents:audit` | 0 | passed |

### Round 2 nits (2026-10-21)

- R2-1: new direct test. An eligible role with `cohort: []` gives percentile null, cohortSize 0, noMarketData true, Demand 0.5 with Low support, and does not throw (demand-rank.test.ts "U14 round 2").
- R2-3: `computeFit` now converts schema failures to a `RangeError` whose message keeps the first Zod issue path. Every domain guard therefore throws RangeError (scoring.test.ts F6 asserts this).
- R2-4: the stacked JSDoc on `SourceScale` is merged into one comment. R2-2 skipped per lead.
- Gates: `npm run typecheck` 0, `npm run lint` 0, `npm run test:unit` 0 with **334 passed** (15 files).
