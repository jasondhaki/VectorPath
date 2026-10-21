## Round 4 — 2026-10-21 (vp-reviewer)

Scope: U01 round-3 fixes ([U01-round3.md](U01-round3.md); lead handoff "Round 3 fixes"). Tools: Read, Grep, Glob, Write. There is no shell, so the gates are **lead-reported, not reviewer-reproduced**: typecheck 0, lint 0, test:unit 78/78, check:docs 0, agents:audit 0, build 0, npm test BLOCKED (no TEST_DATABASE_URL, bootstrap exception). QA must rerun them at W01 candidate integration.

Read in full: `tests/fixtures/contracts/scoring.example.json`, `types/scoring.ts`, `types/provenance.ts` (ObservedFact), `tests/unit/config/contracts.test.ts`, `scripts/agents/ownership-lib.mjs`, `tests/setup/block-network.mjs`, `tests/unit/setup/block-network.test.ts`, `docs/agents/board.md`, the relevant parts of `tests/unit/agents/ownership.test.ts` and the handoff.

### Round-3 findings

| # | Status | Evidence |
|---|---|---|
| R3-1 | fixed | The example now follows §7.3. Resource 225 h × residual 0.36 (= 1 − effective 0.64) = 81; the unmet transferable prerequisite `onet:2.B.1.a` is absent from coverages, so residual 1 × 15 = 15; H 96, W 12. Fit/Reach/Opportunity are unchanged and still match the §7.5 vector (100·0.8·0.5^0.25·0.5^0.25 = 56.5685). The test asserts the residual (max served residual; 1 without evidence) and hours = base × residual with `toBeCloseTo` (contracts.test.ts:24–37). |
| R3-2 | accepted as deferral | It is recorded in the board (line 27) and the handoff (line 77): ranked, unscorable, tie and held-role types stay domain-local in `lib/domain/scoring/` until U15 locks the service DTO. This is acceptable for the W01 lock. U14 is pure domain, U15 is not in W01, and nothing outside the domain consumes those types before U15. Condition: U15's contract lock must publish them before any service or UI consumes them, and U14's handoff must list them as provisional. |
| R3-3 | fixed | `DemandBreakdown` has `snapshotIds`, `snapshotDate` (ISO date, nullable) and `forecastVintage` (scoring.ts:105–109). `ObservedFact.currency` is ISO 4217 or null (provenance.ts:16–17). The example includes the new fields. |
| R3-4 | fixed | Three refinements were added (scoring.ts:28–30, 49, 91), each with positive and negative tests (contracts.test.ts:40–47). |
| R3-5 | fixed, with note R4-1 | `validateOwnership` throws on malformed roles, rules, exclusions and grants, and on an unparseable expiry. `loadOwnership` validates, so the hook fails closed through its catch. Expiry is compared with Date.parse, and an unparseable value counts as expired (ownership-lib.mjs:21–39, 62–64). Tested, including "never" and an offset timestamp (ownership.test.ts:58–68). |
| R3-6 | fixed | `?` is in the escape class (ownership-lib.mjs:9). Tested (ownership.test.ts:71–72). |
| R3-7 | fixed, with note R4-2 | `dns.lookup` and `dns.promises.lookup` are blocked for non-loopback names. All `resolve*` and `reverse` calls are blocked on `dns`, `dns.Resolver.prototype`, `dns.promises` and `dns.promises.Resolver.prototype`. dgram `send`/`connect` are blocked. `syncBuiltinESMExports` covers named imports. Tests cover each surface plus localhost still resolving (block-network.test.ts:26–41). |
| R3-8 | fixed (lead scope) | The board is rewritten with the round-4 stage, the verified `agent_type` identity, contract hashes pending re-lock, the R3-2 decision and a reviewer no-shell note. The handoff states 78 tests. Tracker wording remains for the scribe. |
| R3-10 | carried | It is carried into the U03 assignment (handoff line 81). |

### New findings

| # | Sev | Location | Defect | Required change | Evidence |
|---|---|---|---|---|---|
| R4-1 | minor | scripts/agents/ownership-lib.mjs:32, 64 | `Date.parse` is lenient. Values such as `"9999"`, `"2099"` or `"Oct 21 2026"` (local-time parse) pass validation. A far-future grant is effectively permanent, which the playbook forbids ("no permanent all-path access"). The original R3-5 example `"9999"` is still accepted. | Require a strict ISO-8601 datetime with `Z` or an offset (for example `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z\|[+-]\d{2}:\d{2})$/`). Consider a maximum grant lifetime such as ≤14 days from now at load, with a warning. Add a test for `"9999"`. | ownership-lib.mjs:32 `Number.isNaN(Date.parse(g.expires))`; tests only cover `"never"` |
| R4-2 | nit | tests/setup/block-network.mjs:45 | `dns.lookupService` / `dns.promises.lookupService` (getnameinfo, which can issue PTR queries) are not covered by `isQuery` (`^resolve\|^reverse$`). | Add `lookupService` to the blocked set (allowing loopback addresses) and a test. | isQuery regex at line 45 |

No new secrets or unexpected files. The changes stay within lead-owned paths plus the QA-owned test/setup files covered by grant U01-review-fixes, as declared in the handoff. Contract hashes on board line 26 could not be recomputed (no shell); the lead should publish the full hashes in CONTRACT LOCKED.

Blocking: 0. Minor: 1. Nit: 1. Neither affects the W01 contracts, so the contracts can be locked now. Fix R4-1 before the next grant is issued.

APPROVED WITH NONBLOCKING NOTES
