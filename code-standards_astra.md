# VectorPath — Code standards

## 1. Engineering principles

- Keep modules focused; approximately 250 lines is a review signal, not permission to split coherent logic artificially.
- Fix root causes. No silent catches, fabricated fallback facts, suppressed compiler failures, ignored lint violations or skipped failing tests.
- Keep domain functions deterministic and synchronous with explicit input/output data. Inject dates, identifiers, configuration and randomness where needed; never read them implicitly in domain code.
- State mathematical input ranges, units, assumptions, zero/missing behavior and architecture section in each scoring/path/workload function's documentation.
- Separate source facts from inferred/derived estimates in schemas, not just labels in components.
- Do not commit placeholder feature implementations or successful no-op scripts. A future command may fail explicitly as not implemented; it must not pass a verification gate.
- Prefer typed, boring modules over generic frameworks, global mutable state and speculative abstractions.

## 2. Types, validation and naming

| Rule | Required implementation |
|---|---|
| Compiler | Strict mode, unchecked-index protection and override checks in [`tsconfig.json`](tsconfig.json). Set exact optional-property checking consistently; recommended enabled for the new application. |
| Unknown data | Parse request bodies, files/metadata, params, environment, CSV rows, provider responses, stored JSON and model output through Zod before use. |
| Shared contracts | Runtime schemas in [`types/`](types/); derive static types from them. No parallel hand-written DTO definition drifting from validation. |
| Private task schemas | [`lib/llm/schemas/`](lib/llm/schemas/) may define model-only output schemas. Cross-boundary DTOs remain lead-owned shared contracts. |
| Unsafe shortcuts | No broad any type, non-null assertions, double casts, compiler-ignore comments or lint-disable comments to force code through. Use narrow validated guards. |
| States | Discriminated states for success/error, unavailable data, analysis stages and evidence provenance. Missing numeric fields stay nullable/unavailable; never silently default to zero. |
| Serialization | Use ISO timestamps or date-only strings in DTOs, not non-serializable database/Date objects or bigint values. Preserve numeric precision where required. |
| Names | Kebab-case files/directories; PascalCase components/schema/type names; camelCase functions/variables; uppercase underscore constants. Follow framework special filenames where required. |
| Imports | Type-only imports for types; server-only guards for secret/persistence/provider modules. Avoid barrels that accidentally pull server code into browser bundles. |

Keep money as explicitly typed currency/unit values. Never average different currencies or compare annual/hourly values without verified conversion inputs and an approved rule. Check finite numbers, valid dates, vector dimensions and nonnegative hours at boundaries.

## 3. Enforced imports and I/O

U01 configures lint restrictions plus architecture tests. Rules apply to aliases **and relative paths**, direct imports and re-exports; avoid overlapping flat-config blocks that accidentally replace restrictions.

| Scope | Restrictions |
|---|---|
| [`lib/domain/`](lib/domain/) | No database, service, provider, cache, session, framework, filesystem, network, environment, clock or random imports/calls |
| [`components/`](components/) | No Prisma, database, provider, model or secret configuration; feature UI receives DTOs |
| [`app/`](app/) | Thin routes/pages/actions; services/session/config only for server use, not direct database/integration/model SDK access |
| [`lib/services/`](lib/services/) | No Prisma or model SDK import; call owning boundary modules |
| [`lib/integrations/`](lib/integrations/), [`lib/cache/`](lib/cache/), [`lib/session/`](lib/session/) | No direct Prisma; use database helpers; no service dependency cycles |
| [`lib/llm/`](lib/llm/) | Sole generative-model SDK boundary; no service imports or personal-to-general routing fallback |
| [`lib/embeddings/`](lib/embeddings/) | Sole embedding SDK boundary; same privacy classification requirement |
| [`lib/db/`](lib/db/) | Sole Prisma client boundary; no external provider/model calls |
| [`lib/retrieval/`](lib/retrieval/) | Retrieve evidence via database helpers; no arbitrary web fetch or generation |

Global fetch and dynamic imports must not bypass the matrix. Browser HTTP requests to app handlers are allowed; external server data HTTP belongs in integrations. CLI scripts call boundary helpers and never duplicate domain rules. Test a deliberately invalid import and confirm lint fails before claiming enforcement works.

## 4. Next.js and API conventions

- Server Components by default. Interactive leaves include upload forms, review controls, charts, graph canvases, progress and chat. Load heavy graph code only on graph views.
- A page calls services directly; server-side self-HTTP fetching is forbidden.
- Each private service accepts an authorized, narrowly scoped access capability. The data-access function additionally scopes the actual query to profile/owner. Checking a parent profile once is insufficient if a child ID can belong to someone else.
- Actions live beside their page, and backend owns them. Validate → check origin/session/access → call service → invalidate relevant cache → return typed result.
- Profile pages and exports are private/no-store. Never put user-specific responses in a public CDN cache or globally shared server function cache.
- Demo pages use public immutable scenario data. Demo preview controls cannot persist preferences or issue a live provider call.
- Proxy/header logic is not an authorization layer. Validate every server entry and recheck long-running mutations before commit.
- Add layout-matched loading, error, empty, unavailable and stale states. A failed provider must not blank a usable page.

### Response contract

Normal JSON success has a data payload and optional non-sensitive metadata. Failure has an error code, safe message and request ID, not raw provider output. Use appropriate status: invalid input 400/422, unauthorized profile 404, oversize 413, unsupported media 415, conflict 409, rate limit 429 and unavailable service 503. An internal failure must not return a successful envelope.

Streaming is an explicit exception to the JSON envelope: NDJSON for CV analysis and the selected documented stream protocol for advisor. Validate each event. Set content type, disable caching, and handle split chunks, cancellation and a missing final event. Once headers are sent, represent failure with a terminal error event rather than pretending the HTTP status can change.

Public job queries accept validated country/SOC/query options, never a caller-supplied URL or raw provider parameters. Escape and allowlist outbound links. No secrets in URLs, page props, telemetry or error details.

## 5. Parsing, evidence and prompt safety

Use the exact size/time limits from [`architecture_astra.md`](architecture_astra.md); do not create competing constants in routes and clients. Client validation is convenience; server validation is authoritative.

Required tests include PDF magic with invalid body, encrypted/scanned document, mislabeled extension, TXT decode errors, DOCX ZIP bomb/path traversal, oversized decompressed XML, excessive page count and too-long extracted text. Return an actionable manual-entry path.

Redaction tests cover +880, local BD and international phones, email/URL/handle variants and address lines without destroying legitimate skill terms. Retain an offset mapping through evidence normalization. A quote must match the persisted minimized text, not text stored in a log or an original file that no longer exists.

A schema-valid extraction can still be false. Enforce quote existence, canonical-name allowlists/candidate review, confidence and user confirmation. Evidence provenance is one of extracted, occupation-inferred or self-reported; do not collapse them.

Treat CV/JD/web text as passive untrusted data. Sanitize control characters, enforce length limits and delimit payloads. Delimiters do not make content trusted. No tool execution, new network destinations or authorization decisions may be derived directly from that text.

## 6. LLM contracts and grounded responses

Every task registration specifies:

- Data class and approved provider policy.
- Versioned prompt, validated model-only schema and maximum input/output limits.
- Shared overall deadline, retry count and cancellation behavior.
- Cache scope including profile for personal tasks.
- Deterministic fallback and telemetry fields.

Provider selection reads only `resolveModelMode` from [`lib/config/env.ts`](lib/config/env.ts) (the GEMINI_TIER switch, architecture §12.1). Personal tasks resolve to paid Gemini or the deterministic local engine — never to the unpaid tier — and both paths return the same Zod task schemas. Unpaid-tier calls are offline scripts only, behind a ≤10 RPM token bucket with 429 → committed precomputed output or unavailable.

Prompts live in versioned files under [`lib/llm/prompts/`](lib/llm/prompts/). Use the installed SDK's supported structured-output interface; do not paste obsolete snippets or parse prose pretending it is JSON. A material behavior change requires approval, a new prompt version and relevant evaluation.

Never ask a model to calculate Opportunity, recall salaries, invent provider URLs, provide unsupported occupation IDs or infer psychological traits. Referenced facts are supplied explicitly. IDs returned for selected facts must be from the provided allowlist; user-extracted labels are normalized outside the model.

Grounding validation includes citation support, exact allowed factual values, scope and units. Merely finding the same number elsewhere in the prompt does not prove a claim. Render money/counts/scores from typed records. Unknown source, contradictory fact or unsupported claim fails closed to template/no-answer.

For advisor, whitelist read-only use cases; validate arguments; bind the authenticated profile in server code. Do not allow SQL, arbitrary fetching, file operations, deletion, account management or provider selection as model tools. Validate before display, including streamed claims.

Log task/provider/model/version, timing, token counts, status, fallback reason and safe verification counters. Never log prompts, completions, evidence, messages, files, cookie values, IPs or secrets. Log access follows retention limits.

## 7. Providers, catalogs and SQL

### Integration pattern

Each approved provider has its own entry module, live client, fixture client, response schemas and mapper under [`lib/integrations/`](lib/integrations/). Shared runtime fixtures live under [`data/fixtures/`](data/fixtures/); synthetic test mocks live under [`tests/fixtures/`](tests/fixtures/).

Provider output is a typed result carrying observed data or unavailability, not an exception silently converted to invented values. Validate schema before caching. Sanitize warnings to provider/error category/schema path, never payload or keys. Honor retry-after where valid, but remain inside total time/quota bounds. Reserve quota before each dispatched attempt.

Only successful fresh requests obtain a new fetched timestamp; cache reads retain it. Seeds record source version, license, processed/skipped/error counts and resumable checkpoints. Re-running an import must not duplicate rows or reset user data.

### Resource link checking

- Check only approved catalog URLs; users cannot feed arbitrary URLs into the checker.
- Allow HTTPS, verify hostname/IP targets and each redirect, block loopback/private/link-local/metadata destinations, and defend against DNS rebinding where the runtime permits outbound resolution control.
- Limit redirects, response bytes, concurrency and timeout. Do not download an entire course to validate a link.
- Distinguish reachable, dead, blocked/unknown and authentication-required. A 403 is not automatically a dead resource.
- Free-access review is a separate recorded check. Broken/unverified resources do not satisfy a vetted recommendation; provide an honest fallback.

### Database standards

Prisma only in [`lib/db/`](lib/db/). Use parameterized queries; never concatenate untrusted SQL or use unsafe raw-query APIs. Vector literals are validated arrays converted to a parameter, never embedded by string concatenation into SQL. Order nearest-neighbor searches by the indexed distance expression and bound the result count.

Migrations are append-only after application. Generate, inspect and test SQL on an isolated database. Coordinate schema ownership before changing it. A reset is permitted only with an explicit approved isolated-test target, never inferred from a connection string being called development.

Transactions cover multi-window budgets, profile revision checks, plan progress mutations, session revocation/deletion and idempotent finalization. Avoid long model/network calls inside database transactions. Handle unique constraints as expected concurrency outcomes, not unexplained 500 errors.

## 8. Styling and accessibility

Use only [`ui-context_astra.md`](ui-context_astra.md) tokens, exposed through [`app/globals.css`](app/globals.css). No default palette classes, arbitrary hex colors, light-mode theme or competing custom CSS file. Dynamic node positions and bar widths are acceptable inline values; colors remain tokens.

Generated [`components/ui/`](components/ui/) primitives are composed, not hand-edited. The lead adds them through a verified CLI operation; review any resulting configuration changes. Feature wrappers live in their component folders.

Use semantic HTML, keyboard-accessible controls and labeled dialogs; preserve focus. Status always has text/icon plus color. Graphs/charts provide equivalent list/table summaries. Honor reduced motion. Every fact carries provenance; every estimate identifies its assumptions and calculation version. Do not label mock displays as measured statistics.

Token lint checks application components/styles, not legitimate documentation examples, third-party packages or generated test artifacts. Accessibility is verified on actual rendered views, not asserted solely from a palette table.

## 9. Test matrix

| Area | Minimum coverage |
|---|---|
| Scoring | Hand-computed examples; zero/missing groups; no titles; lowered overrides; absent zones; missing/zero counts; tied percentiles; insufficient cohort; all weights; exact tie ordering; diversity relaxation |
| Workload/plans | Shared resource counted once; unmet prerequisites; no catalog; complete versus first-twelve display; manual/suggested cycle distinction; long resource splitting; hours change; stable progress keys; UTC dates |
| Paths | Known toy graph optimum; cycles; hop/week bounds; distinct green targets; disconnected graph; user first-hop versus reference later-hop assumptions |
| Evidence | Whitespace/quotes/dashes offsets; redaction boundaries; dropped unverifiable items; inference/manual labels; ambiguous normalization |
| Privacy routing | No personal task or extracted phrase can resolve to unapproved general model/embedding adapter; no personal cache cross-owner reuse |
| Authorization | Guest ownership; child-ID mismatch; demo write denied; expired/revoked session; CSRF; private no-store responses |
| Concurrency | Atomic budgets and rollover; duplicate analysis ID; stale profile revision; delete during analysis; regenerate during progress edit |
| Providers | Real permitted recorded response parsing; missing key; 429/5xx; stale/unlicensed fixture refusal; unsupported BD postings; safe link redirects |
| Export/delete | Owner-only export; no hashes/secrets; deletion of text, JD, interests, matches, plans, paths and private caches; unrelated data survives |
| UI/E2E | Persona flow, upload/manual review, role/plan, regional change, both graph/list views, JD comparison, privacy and each enabled P2 feature |
| Evaluation | Frozen labels and candidate parity; BM25; actual capture provenance; reproducible metrics; no fabricated output or result files |

Tests use a network-blocking setup for **server and browser**. Allow only the local app and explicitly isolated database endpoints. Browser request interception alone cannot block server-side model calls. Configure local/system fonts for network-free builds or package permitted local fonts; do not let a build unexpectedly depend on a public font server.

Unit tests run without a database. Database integration and E2E use an explicit test database and cannot be silently skipped when it is missing: the aggregate test command fails with setup instructions. CI provisions the isolated target, seeds fixture reference data and never receives production secrets.

## 10. Required commands and honest evidence

The four core gates are npm run typecheck, npm run lint, npm test and npm run build. Run npm run test:e2e for affected flows; npm run eval after scoring/normalization/prompt changes with valid captures. Run npm run check:docs for specification/tree consistency.

Separate npm run eval:capture is an explicit approved live operation using only synthetic benchmark input; it is not part of tests or CI. An offline eval reuses recorded captures and prints their model/prompt/version. No capture means extraction results are unavailable, not 100% from mocks.

Every handoff records command, target revision, timestamp, exit status and concise actual results. Distinguish not run, blocked, failed and passed. Missing infrastructure or credentials may block a live acceptance criterion without blocking unrelated fixture development; never mark that criterion passed.

## 11. Review and protected artifacts

Preserve existing migrations, frozen benchmark labels/CVs, recorded fixtures and persona versions. Lockfiles change through npm, generated primitives through CLI, and secrets only through human-managed configuration. Model weights, prompt behavior, providers and privacy behavior need approval and versioned evidence.

Update relevant documentation and the file tree in the same accepted unit. A code change that contradicts the architecture is not justified merely because it passes tests. Follow [`ai-workflow-rules_astra.md`](ai-workflow-rules_astra.md) and [`claude-agents_astra.md`](claude-agents_astra.md) for approvals, ownership and completion.
