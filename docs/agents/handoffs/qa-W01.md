# Handoff — qa W01 integrated QA

Role: vp-qa · Date: 2026-10-21 · Revision: uncommitted working tree · Contract lock v1; hashes verified.

## Summary and acceptance

Assignment: independently QA U02, U03, U14 and U18. That covered rerunning the gates, adding browser QA at 375/1024/1440 with network blocked, an acceptance and invariant audit, adopting the U03 harness, the R3-10 `require-test-db` follow-up and the check-tokens request. The full record is in [../qa/W01.md](../qa/W01.md).

Result:
- U02 PASS, U03 PASS, U14 PASS.
- U18 PASS against its Done-when, with BUG-W01-001 (Medium) open; it blocks U19b.
- Error/loading browser render and screen-reader checks are BLOCKED; reasons are in the record.

## Changed paths

- `playwright.config.ts`
- `tests/e2e/fixtures.ts`
- `tests/e2e/shell.spec.ts` (new)
- `tests/e2e/mobile.spec.ts` (new)
- `tests/e2e/rail.spec.ts` (new)
- `tests/e2e/wide.spec.ts` (new)
- `scripts/check-tokens.mjs`
- `scripts/require-test-db.mjs`
- `tests/unit/scripts/checkers.test.ts`
- `docs/agents/qa/W01.md` (new)
- `docs/agents/bugs/BUG-W01-001.md`, `BUG-W01-002.md`, `BUG-W01-003.md` (new)
- this handoff

## Commands (final, exit codes)

| Command | Exit | Result |
|---|---|---|
| typecheck | 0 | — |
| lint | 0 | — |
| `npm test` with inline TEST_DATABASE_URL | 0 | 341 unit + 53 integration |
| build | 0 | — |
| test:e2e | 0 | 38 passed |
| check:docs | 0 | — |
| agents:audit | 0 | — |
| db:size | 0 | 9.25 MB |

## Invariants touched

- I10: E2E network block is kept in each new browser context.
- I17: axe and token lint.
- I18.

## Doc and tree updates requested

- project-file-tree: new e2e specs.
- tracker: contract hashes.
- README: the integration pre-check now reads `.env.local`.

## External usage

None.
