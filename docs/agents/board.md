# VectorPath — Agent board

Last updated: 2026-10-21 by lead.

## Wave

- Wave: W01.
- Stage: W01 COMPLETE 2026-10-21. QA PASS for U02, U03, U14, U18 (docs/agents/qa/W01.md); recorded by scribe. Final gates: typecheck 0, lint 0, npm test 0 (473 unit + 53 integration), test:e2e 38/38, check:docs 0, agents:audit 0. Bugs: 001/002/003 CLOSED; BUG-W01-004 (Medium, BD hall/rural-IN address forms) OPEN with vp-domain — blocks U19b only. W02 awaiting owner go-ahead.
- Baseline revision: none (no commits — project owner has not authorised commits).
- Candidate revision: working tree (uncommitted).
- Freeze: contracts locked v1 (below); changes only via REQUEST → lead.

## Units

| Unit | Owner(s) | Paths | Contract | Status |
|---|---|---|---|---|
| U00 | scribe (research) + human | [docs/verification/providers.md](../verification/providers.md) | — | in review; human items listed there |
| U01 | lead | root config, `.claude/`, `scripts/`, `types/`, `tests/fixtures/contracts/`, scaffold files | v1 (hashes below) | accepted (round 4 APPROVED WITH NONBLOCKING NOTES, R4-1/R4-2 fixed); aggregate gate closes in U03 |
| U02 | vp-frontend | `app/` pages/layout/globals.css, `components/` (not `components/ui/`), `public/` | ui-context_astra.md tokens | reviewed (APPROVED WITH NONBLOCKING NOTES, fixes applied) — QA pending |
| U03 | vp-backend | `prisma/`, `prisma.config.ts`, `lib/db/`, `docker-compose.yml`, `scripts/db-size.ts`, `tests/unit/db/`; grant `tests/integration/**`, `tests/setup/integration-*.ts` | architecture data model | reviewed round 2 (APPROVED WITH NONBLOCKING NOTES) — QA pending |
| U14 → U18 | vp-domain | `lib/domain/scoring/`, `lib/domain/evidence/`, `lib/domain/redaction/`, matching `tests/unit/domain/` | types/scoring.ts, types/evidence.ts, types/provenance.ts | both reviewed round 2 (APPROVED WITH NONBLOCKING NOTES) — QA pending |
| U32a | qa + human | `eval/` | — | not dispatched: Q09 independent labeler not approved |

## Contract lock v1 — CONTRACT LOCKED 2026-10-21

- types/scoring.ts cf0918110921bf273e8360cc856e69c87c0c4e8397995d4f9e8a51d8e82fa364
- types/evidence.ts 550f7e1ab5bce192be752282e8b09fcb76e7438c63b251861f8adf7415968733
- types/provenance.ts 86f930358bb8d6c496f6e1986d56b172ab5d467bfa1f701dee6500c231216bf2
- tests/fixtures/contracts/scoring.example.json b58e4ec35a6d34180aa3480f0f08a58b203749ef7f5e0e76365207a3163dc6ed
- tests/fixtures/contracts/evidence.example.json 591fa13922b0988452c0723d372287a8085a8feb2be56ba0bcce208fe3a759dd
- Ranked-output/unscorable/tie/held-role types: domain-local in `lib/domain/scoring/` until U15 locks the service DTO (R3-2 decision).

## Candidate integration — 2026-10-21 (lead)

- Working tree, uncommitted. typecheck 0; lint 0; npm test 0 (unit 334/334, integration 53/53, local Docker test DB); build 0; test:e2e 0 (1/1, port 3100); check:docs 0; agents:audit 0; db:size 0 (9.25 MB / 150 MB; vector 0.8.1, pg_trgm 1.6).
- Bootstrap exception closed: the aggregate gate now runs over U01/U02/U14/U18.
- Open for owner: F3 dedup rule (recommend keep highest required level); `.env.local` local DB lines.
- Known: the create-only migration script is interactive-only once HNSW drift exists; the manual diff → strip protected drops → deploy route is in backend-U03.md; README update via scribe.
- QA dispatched (vp-qa) → docs/agents/qa/W01.md.

## Locks and grants

- Schema lock: free — released by lead 2026-10-21 after QA PASS on U03 (docs/agents/qa/W01.md). Stale `prisma migrate dev` (PID 20940, BUG-W01-003) stopped by lead.
- Grants: see `.claude/ownership.json` — lead U01-record and U01-review-fixes expire 2026-10-21T00:00Z; backend U03-integration-harness expires 2026-10-22T00:00Z.
- Installer: lead only. Prisma 7.10.1, @prisma/adapter-pg, pg, dotenv already installed.

## Enforcement status

- PreToolUse ownership hook and command guard verified live. Identity: hook `agent_type`; **verified 2026-10-21** — vp-reviewer write to `lib/domain/` denied as reviewer.
- Shell writes bypass file hooks; the guard is a regex heuristic, not a sandbox. Every handoff is checked with `npm run agents:audit`.
- vp-reviewer has no shell: its verdicts cite lead/QA gate runs, not reproduced ones.

## Blockers

- None for W01. Data preconditions: free Lightcast/Adzuna registrations (human); deadline needed only for U41.
- Docker Desktop available for U03 local pgvector.
- Note: port 3000 is occupied by an unrelated project's dev server (`D:\jhunus-craft`); VectorPath E2E/dev must pick another port.

## Measured usage

- External provider/model calls by the app: none.
