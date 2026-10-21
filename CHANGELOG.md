# Changelog

## 2026-10-21 — W01 (U02, U03, U14, U18)

- QA PASS on the uncommitted integrated working tree (no commits; contract lock v1). Verified: U02 shell, tokens and states; U03 database and migrations; U14 versioned scoring domain (astra-v1 baseline, untuned); U18 redaction and evidence domain. Record: [docs/agents/qa/W01.md](docs/agents/qa/W01.md).
- QA gates, exit 0: typecheck, lint, `npm test` (unit 341/341; integration 53/53 against the local disposable test database), build, `test:e2e` (38/38 at 375, 1024 and 1440 px; third-party network blocked), `check:docs`, `agents:audit`, `db:size` (9.25 MB of 150 MB, empty schema).
- Open: BUG-W01-001 (Medium, GB/US/IN address minimization; reopened, with vp-domain; blocks U19b). BUG-W01-002 and BUG-W01-003 are closed. Browser render of the error and loading routes and screen-reader checks are BLOCKED.
- Owner decisions 2026-10-21: D25 requirement dedup keeps the highest weight and highest required level (architecture §7.1); D26 quote matching applies NFC per grapheme cluster, case-sensitive (architecture §6.2). Tracker §9 Q12, Q13 and Q14 are resolved or closed.
- Tooling: `axe-core` 4.14.0 is pinned as an exact devDependency (QA W01 §7.1 closed).
- Local Docker pgvector 0.8.1 is used for development and tests. No provider or model calls were made.

## 2026-10-20 — Owner directive: free demo mode

- Recorded owner sign-off (architecture §12, tracker D18–D24): $0 non-commercial demo, `GEMINI_TIER` unpaid/paid switch, deterministic local engine, gemini-embedding-001 768-d with manual L2 normalization, free data-source rules and attributions. Provider log statuses updated; no unit blocked.
- Installed `ai@7.0.146`, `@ai-sdk/google@4.0.101`, `dotenv@18.0.8`; `engines.node` is `>=24.0.0`; `GEMINI_TIER`/`GEMINI_API_KEY` added to the environment contract with a tested `resolveModelMode`.

## 2026-10-20 — W00

- U00: provider/logistics verification log recorded; five items blocked on the project owner (see docs/verification/providers.md).
- U01 (in review, not yet independently verified): pinned scaffold, strict TypeScript, lint boundary matrix with token check, Vitest/Playwright with network blocking, docs checker, safe environment example, nine agent role definitions, ownership map with tested hooks and diff audit, initial locked contracts (provenance, scoring, evidence).
