# VectorPath — Architecture

## 1. Stack and verification gates

| Layer | Decision | Setup constraint |
|---|---|---|
| Application | Next.js App Router, supported stable release, strict TypeScript | Pin compatible versions and Node LTS in U01. Use the routing/config APIs of that installed version; do not blindly copy legacy middleware or SDK syntax. |
| UI | Tailwind v4, shadcn/ui, Lucide, React Flow, Recharts | One CSS-first dark token system. Accessible list/table alternatives to graphs. |
| Database | PostgreSQL on a verified free Neon plan, Prisma, pgvector and pg_trgm | Runtime pooled connection; direct migration connection. Verify extensions/region/quotas. Development may use isolated local PostgreSQL. |
| Hosting | Verified eligible free Vercel deployment | Confirm non-commercial eligibility, body/duration/memory limits and supported region before deployment. Singapore is the working regional preference, not a promise. |
| Parsing | PDF text parser (pdf-parse or unpdf, chosen and pinned in U19b), mammoth, bounded plain-text decoder | Node runtime, bytes in memory; no uploads persisted to disk/blob. |
| LLM | Vercel AI SDK ai@7.0.146 + @ai-sdk/google@4.0.101; GEMINI_TIER switch (§12.1) | Unpaid Gemini: public offline tasks only. Paid Gemini (final stage, config only): personal tasks. Otherwise the deterministic local engine (§12.2). Groq optional and disabled. |
| Embeddings | gemini-embedding-001, 768 dimensions, SEMANTIC_SIMILARITY, manual L2 normalization; separate local-hash-ngram-v1 fallback identity (§12.3) | Public reference vectors precomputed offline and committed. Personal phrases never reach the unpaid tier. |
| Sessions | Random guest-session token with server-side hash | No external auth required. Conditional account upgrade is a separate approved design. |
| Tests/scripts | Zod, Vitest, Playwright, tsx and Node scripts | Fixtures/mocks in tests; imports and bulk embedding only in developer/approved maintenance jobs. |

No required Clerk, Inngest, Redis, blob storage, Common Crawl processing or separate vector database. Streams provide progress **within a bounded request**; they are not durable jobs and do not bypass hosting timeouts.

Before live operation, record official URLs, check date, versions, terms, approved retention, quota and attribution in [`docs/verification/providers.md`](docs/verification/providers.md). Verify the actual source release, model availability and provider constraints before selecting them.

## 2. Boundaries and dependency direction

| Layer | Responsibility | Allowed collaboration |
|---|---|---|
| [`app/`](app/) | Routing, input validation, access, response/render | Calls services and session checks; never SQL, providers or domain formulas |
| [`components/`](components/) | Rendering and local interaction | Serializable contracts, UI utilities; no server secret imports |
| [`types/`](types/) | Shared Zod contracts and inferred types | No I/O, React, framework or business rules |
| [`lib/domain/`](lib/domain/) | Pure scoring, gaps, paths, plans, normalization rules, evidence and redaction | Plain inputs/outputs and contracts only; injected clock/IDs |
| [`lib/services/`](lib/services/) | Use-case orchestration | Combines boundaries; owns transactions/use-case policy but no inline SQL or formulas |
| [`lib/db/`](lib/db/) | All Prisma queries and parameterized vector SQL | Configuration/contracts; does not call providers or services |
| [`lib/session/`](lib/session/) | Tokens, access capabilities, request-origin checks | Database helpers/configuration; never depends on services |
| [`lib/cache/`](lib/cache/) | TTL and provider-budget policy | Database helpers; no imports from integrations |
| [`lib/integrations/`](lib/integrations/) | Approved external data/file ingestion and link health | Provider schemas, cache/budget helpers and configuration |
| [`lib/embeddings/`](lib/embeddings/) | Embedding provider and offline cache | Privacy policy, config and database helpers where needed |
| [`lib/llm/`](lib/llm/) | Model tasks, privacy routing, prompts, grounding | Contracts/config/cache/db helpers; never calls services directly |
| [`lib/retrieval/`](lib/retrieval/) | Fact retrieval and citation packaging | Database/embedding helpers; returns evidence, does not generate narrative |
| [`lib/parsing/`](lib/parsing/) | Bounded PDF/DOCX/TXT extraction | Parser packages and contracts; no persistence |
| [`scripts/`](scripts/) | CLI composition and maintenance | Uses services/boundaries; no duplicated domain math |

Advisor tool callbacks are assembled by a service and passed to the model layer; this avoids circular service/model imports. Pages never request the application's own HTTP endpoints on the server. Browser calls to public handlers are permitted.

## 3. Provenance and canonical identity

Shared contracts distinguish four categories; keep them separate end to end:

1. **Observed external fact:** value, provider, source/version, source URL, license ID, original fetched time, observed period, units/currency and mode (live, cached or recorded fixture). Null is not zero.
2. **Derived estimate:** value, model/calculation version, computed time, source fact IDs, assumptions and support quality. Scores, learning hours and sector proxies belong here.
3. **Projection:** scenario, horizon, generation version, supporting fact IDs and qualitative confidence; explicitly not a measured future fact.
4. **Unavailable:** reason such as unsupported region, no source, permission unavailable, quota exhausted, stale beyond policy or unknown requirement.

A cached record retains its original fetched time. Retrieving it now does not make it fresh. World Bank observation year/forecast vintage and Adzuna query/sample definition remain visible. Confidence means evidence support, not a statistically calibrated probability.

Canonical IDs are namespaced: O*NET occupation codes; O*NET descriptor element IDs; Lightcast skill IDs; and deterministic O*NET-derived skill IDs for permitted unmapped software examples. Store provenance on crosswalks. Unknown user names stay unresolved and excluded from scoring until mapped; do not invent taxonomy identities or pretend a self-entered skill was verified by a source.

Normalization order: exact normalized alias, deterministic fuzzy candidate lookup, then permitted embedding candidates. Starting fuzzy similarity threshold 0.70, embedding threshold 0.85 and minimum top-two margin 0.05; thresholds are versioned and benchmarked. Ambiguous matches are presented for confirmation. Vector neighbors can yield partial transferable credit, never proof that two skills are identical.

## 4. Source pipeline and licensing

### 4.1 Imports, in order

Every seed is idempotent on natural keys, resumable, versioned and audited. It must not delete unrelated/versioned records to force an upsert to succeed.

| Order | Command | Result |
|---|---|---|
| 1 | npm run seed:onet | Verified release manifest, occupations, source scales, descriptors, requirements, titles, related roles, tasks, zones and available education/interests/work-context facts |
| 2 | npm run seed:lightcast | Permitted skills/aliases; explicit limited coverage if access is not approved |
| 3 | npm run seed:config | Country codes, currency/locale, sector mapping and green targets resolved to actual occupation codes |
| 4 | npm run seed:embed | Reference-only vectors; resumable cache keyed by model, dimensions, task type and text hash |
| 5 | npm run seed:map-software | Canonical software mappings and traceable O*NET-derived fallback records |
| 6 | npm run seed:resources; npm run check:links | Reviewed free catalog and prerequisites with access/link verification dates |
| 7 | npm run seed:graph | Compact occupation profiles, neighbors and role edges using the canonical workload estimator |
| 8 | npm run seed:macro | Verified WDI/GEP observations; unavailable series remain absent |
| 9 | npm run seed:market -- --dry-run; npm run seed:market | Budgeted query snapshots/listings in approved markets; resumable across days |
| 10 | npm run seed:personas | Immutable per-persona/per-country scenario snapshots with top-five plans and supported detail/path snapshots |
| P2 | npm run seed:outlook | Bounded licensed fact corpus and cited general-role scenarios, then regenerate persona snapshots |

Commands are listed separately, not a shell script to run blindly. Graph generation depends on implemented scoring/workload functions, not on completed runtime CV ingestion. Freeze benchmark labels early in parallel; do not wait until after tuning.

**O*NET import rule:** inspect the verified release's dictionary, headers, scale ranges, suppression/not-relevant flags and file inventory. Store the actual count and checksums in [`data/config/sources.json`](data/config/sources.json). Fail clearly on unexpected columns. Do not require exactly 923 rows, assume four/five Job Zones, or silently convert legacy filenames. Import the whole eligible release where licensing/storage permit, not only demo target roles.

**Lightcast rule:** API access, full-taxonomy storage, redistribution and attribution need verification. Tests use lawful samples. If live access is blocked, implement the adapter with allowed fixtures and explicit limited coverage; do not claim complete taxonomy coverage.

**Adzuna rule:** one team account. Application caps are 20/minute and 200/day (owner decision §12.5), plus 900/week and 2,300/month, but effective caps are the **lower** of configured caps and verified account limits. Counts/means/retention/public display require explicit terms approval. Without approval, suppress the affected data; a recorded fixture does not bypass terms. Store query, filters, endpoint and observation date. A search count is not all vacancies. Do not label a supplied mean as a median or invent histogram percentiles.

**World Bank rule:** map BD/IN/GB/US to BGD/IND/GBR/USA. WDI sector-growth candidates are NV.AGR.TOTL.KD.ZG, NV.IND.TOTL.KD.ZG and NV.SRV.TOTL.KD.ZG. GDP-growth candidate is NY.GDP.MKTP.KD.ZG. Verify GEP source/series availability and vintage; confirm the forecast endpoint from current official API metadata. Missing forecast means no forecast adjustment.

**Free learning rule:** 100–150 resources is a curation target, not a reason to invent entries. Catalog fields include provider, URL, mapped requirements, level/language, estimated hours, whether hours are supplied or estimated, access note, optional paid certificate disclosure, free-access checked date and link status. Coursera audit is included only when the specific resource is currently free to study. A successful HTTP response is not evidence of free learning access.

### 4.2 Cache and fallback

- DATA_MODE selects live or fixtures. LLM_MODE selects live or mock. Mock model outputs are restricted to tests/local synthetic development; never fabricate a real guest's extraction.
- Default TTLs: listings 24 hours; market statistics seven days; macro records 30 days. These are policy settings, not license permissions.
- Live read: fresh lawful cache → budgeted live request → permissible stale cache → permitted recorded fixture → unavailable. Always show mode and real date. Do not use a provider/region-mismatched record.
- Listing links older than seven days default to unavailable; market snapshots older than 30 days and macro observations more than five years old are not scoring inputs. Cached macro fetch age and observation-year age are different checks. Demo historical snapshots may display older records **as historical snapshots**, not live availability.
- Budgets reserve all applicable windows atomically in one database transaction. Retries each consume a reservation once a request is dispatched. Failed/429 calls count conservatively; never release a used slot. Test concurrency and UTC window rollover.
- Integrations use bounded timeouts, capped backoff and validated payloads. An upstream failure changes coverage, not a salary/count into a plausible replacement.

## 5. Persistence contract

Models below name logical entities, not a mandate for huge generic JSON blobs. Validate any persisted JSON and version its schema. Database migrations implement uniqueness, foreign keys, indexes and cascades.

### Shared reference data

| Entity group | Required content |
|---|---|
| SourceManifest / IngestionRun | Source version, license/use decision, checksums, source periods, counts, checkpoints, errors and timestamps |
| Occupation / OccupationTitle | SOC, title, description, major/minor groups, source zone/scale, sector, green tag and source version; normalized aliases |
| OnetElement / OccupationRequirement | Descriptor kind, raw importance/level, raw scale identifiers, normalized weight/required level, suppression flags, hot/in-demand flags and source record ID |
| Skill / SkillAlias / SkillNeighbor | Namespaced ID, names, source, approved alias/crosswalk and top-ten neighbors with similarity ≥0.80 |
| OccupationProfile / OccupationEdge | Compact scored requirements, data version; directed relationship or similarity edges with provenance and workload breakdown |
| OccupationTask / OccupationalFact | Tasks, education, interests, work context, emerging/historical facts with source vintage; only available verified fields |
| MarketStat / MacroIndicator / SectorSignal | Role-country-query statistics; country/year/source/vintage macro observations; derived sector proxy and support facts |
| LearningResource / ResourceSkill / SkillPrereq / MilestoneTemplate | Verified free catalog, mapped coverage, reviewed dependency edges and generic suggested projects |
| OutlookFact / RoleOutlook | Licensed fact records and public-role scenarios with citations/horizon; no invented automation-risk column |
| DemoScenario | Immutable persona, country, preference hash, data/scoring/prompt version and precomputed artifacts |

### Owner-scoped and operational data

| Entity group | Required content and lifecycle |
|---|---|
| GuestSession | Token hash, created/expiry times, revoked flag, privacy-consent version; no raw token |
| Profile | Session FK for guests; immutable demo identity for demos; country, study hours, preferences, revision and activity time |
| CvText | Profile FK, minimized text, content hash and parser version; no original file bytes |
| ProfileExperience / ProfileEducation | Parsed or manual fields, verified quote/offsets when extracted, mapping candidates, confirmation flag |
| ProfileSkill / ProfileDescriptor | Canonical or unresolved identity, proficiency, source category, evidence, confirmation and deletion state |
| MatchRun / Match | Profile revision, country, scoring/data versions, input hash, full-precision components, rank, coverage, workload and support facts |
| Plan / PlanItemProgress | Profile, discriminated target (occupation or JD target), input/catalog versions, all gaps, prerequisites, selected resources, phases, estimates and progress keyed by stable item ID |
| PathRun | Profile revision, graph version, target/lens, constraints, paths and provenance |
| JobTarget / JobRequirement | Redacted pasted JD, user confirmation, evidenced canonical requirements and unresolved items; owner-only |
| InterestResponse | Optional user answers and scoring version; deletes with profile |
| AnalysisRun | Owner session/profile, idempotency key, actual stage, failure category and expiry; no uploaded file or raw prompt |
| ApiCache / ApiBudget / RateLimit | Public cache and atomic provider/request budgets; no personal data in public cache |
| LlmCache / LlmCall | Cache key includes task/model/prompt/input and profile scope if personal; telemetry contains counts/timing/status only |

All private derived rows cascade from the profile/session. Denormalized personal caches must carry an enforceable profile foreign key. A public cache key must never contain raw CV text, token or user query. No profile vector is needed for the baseline; adding one requires the same deletion/privacy contract.

Vectors: Skill, Occupation and OccupationTitle reference vectors use 768 dimensions with one model/task type and normalization convention. Validate length, finite values and nonzero norm. Declare unsupported vector columns as required by the installed Prisma version, create extensions/indexes in migration SQL, and query only through [`lib/db/vector.ts`](lib/db/vector.ts). A model/dimension/task change requires re-embedding and index/cache-version changes, never mixed vectors. Measure actual index/storage size; 700 MB is an initial safety target only if below the verified plan limit. Do not silently switch precision types to save space.

## 6. CV, session and privacy lifecycle

### 6.1 Guest access

- Issue 32 cryptographically random bytes in an httpOnly session cookie. Use Secure in HTTPS production, SameSite=Lax and Path=/; local HTTP may disable Secure only in explicit development configuration.
- Store a hash, not the token. A session owns multiple profiles. All personal reads/mutations obtain a scoped access capability and database queries bind both profile and owner identity. Do not accept a caller-supplied owner identifier as proof.
- Demo reads are public; demo writes always fail. Unknown and unauthorized profile IDs both return not found.
- Validate same-origin/CSRF protections on state-changing requests, including multipart creation and deletion; reject cross-site requests, validate configured origins and do not trust an arbitrary Host header.
- Default session expiry is 30 days. Guest profiles expire after 30 days of inactivity or session expiry, whichever comes first. Enforce expiry on reads, not only a cleanup script. No undocumented indefinite sliding retention.
- Revoke before deletion. A finishing analysis transaction must re-check session revocation and revision so an in-flight request cannot recreate deleted data.

### 6.2 Analysis pipeline

Consent and limits → validate **4,000,000-byte** maximum, extension/MIME and magic bytes → bounded parser → redact/minimize → approved personal model → verify quotes → local/permitted normalization → persist review state → user confirmation → deterministic matching.

- PDF/DOCX/TXT only. Limit PDF pages to 25, DOCX uncompressed content to 20 MB and total extracted text to 50,000 characters. Reject archives with unsafe entries or excessive expansion; do not treat a ZIP signature alone as valid DOCX.
- Send at most 12,000 redacted CV characters to extraction. Oversize input requires an explicit shorten/select-text step, not silent truncation followed by a completeness claim. JD limit is 12,000 characters; advisor question limit is 2,000.
- Remove emails, phones including +880/local BD formats, URLs/handles and address lines. Redaction is imperfect and does not anonymize names/employers/narratives; all derived content remains personal.
- Evidence is matched against the persisted minimized text, normalizing whitespace/quotes/dashes with a map to original offsets. Owner-approved 2026-10-21 (D26): the quote and the persisted text also receive Unicode NFC applied per grapheme cluster; a span never splits a grapheme cluster; matching remains case-sensitive. Do not ask a model to invent offsets. Drop unlocatable extracted items and record counts, not content.
- Inferred descriptors are traceable to a confirmed prior role and its source requirements. They are suggestions until accepted. Manual additions are labeled self-reported, not given a fake CV quote.
- Initial request-rate defaults: five analyses/hour/session, 40/day/HMAC-hashed IP and a verified quota-derived global daily cap. Also budget manual creation, recomputation, jobs, exports and advisor. IP hashing uses a secret and bounded expiry; it is not anonymous data.
- NDJSON emits actual reading, redacting, extracting, normalizing, persisting, ready-for-review, done or error stages with an analysis ID. Before headers, use proper HTTP errors; after streaming starts, send a terminal typed error event and close. The client must handle incomplete streams.
- Total operational budget 55 seconds, acceptance ≤60 seconds p95; model attempts share at most 40 seconds, with one retry only if time/quota remain. Host maximum duration must be verified and configured above the operational budget, not used as the UX target.
- No durable work is assumed after disconnect. Propagate cancellation; transactions prevent partial profile state. Owner status lookup may recover a completed result or report interrupted/retryable. A repeated idempotency key returns the same completed result rather than duplicating profiles.
- No approved provider/key, parser error or extraction failure: offer manual entry and retry. Never substitute another persona's or mock extraction for a real upload.

### 6.3 Export, deletion and retention

JSON export includes the owner's profiles, minimized stored text, skills/evidence, preferences, matches, plans/progress, paths, JD targets and interests. Exclude tokens, secret hashes, provider credentials, security logs and other owners. Use attachment responses and no-store caching.

Delete my data requires a confirmation action and origin check, revokes the guest session, deletes all its profiles and private caches transactionally, and clears the cookie. Public personas/reference data remain. Test deleting during analysis and plan generation. Optional account support must redesign/verify this lifecycle before enabling it.

Retention maintenance runs daily through an approved free scheduler or documented operator action, with dry-run and environment guard. Record actual operation; do not promise automatic physical deletion until scheduling is configured. Explain any provider/database backup retention from verified terms. Logs contain IDs/status/durations only, never text, quotes, tokens, IPs or credentials.

## 7. Canonical matching model

All tuning constants live in [`lib/domain/scoring/weights.ts`](lib/domain/scoring/weights.ts). Initial scoring version is astra-v1. Keep internal components in [0,1]; display 0–100, rounded only at presentation. Each result returns its inputs and breakdown. Empty/invalid data never produces NaN or invented facts.

### 7.1 Role and user requirements

For descriptor importance, normalize using the release's scale minimum/maximum: w = (importance − minimum)/(maximum − minimum), clamped to [0,1]. Include positive-weight requirements with normalized importance ≥0.50. Required level is likewise normalized using the verified level scale. This matches familiar 1–5 and 0–7 inputs only when those scales are actually present.

For mapped software requirements: w = 0.50 + 0.25 × hot + 0.25 × inDemand, required level = 0.50. Deduplicate identical canonical requirements, preserving the strongest weight and all source references. Owner-approved 2026-10-21 (D25): the kept requirement takes the highest weight and the highest required level, which may come from different source rows, consistent with the §7.3 prerequisite rule. Suppressed/unusable/zero-required descriptor rows do not contribute to denominators. No positive usable requirements means the role is unscorable, not perfectly matched.

User software proficiency 1/2/3/4 maps to 0.25/0.50/0.75/1.00. Accepted occupation-inferred descriptor level = source normalized level × min(1, years/2); unknown years receive no time-derived credit. Extracted descriptor suggestions use evidence-backed level/5 capped at 0.8 until confirmed. A user override takes precedence, including a lower override; otherwise use the maximum accepted evidence/inference level. Deleted or unconfirmed items do not silently reappear from inference.

### 7.2 Coverage and Fit

For each requirement with required level q > 0:

- Direct coverage d = min(1, accepted user level/q).
- Software neighbor coverage n = maximum of 0.6 × similarity × min(1, neighbor proficiency/q), among approved neighbors with similarity ≥0.80; zero if none. Descriptors have no neighbor credit.
- Effective coverage c = max(d,n).
- State: Have if d ≥0.90; Partial if 0.40 ≤ d <0.90; Transferable if d <0.40 and n ≥0.30; To build otherwise. An inferred/manual badge is separate from coverage state.

FitDesc = Σ(wc)/Σw over descriptor requirements. FitTools = the same over software requirements. If only one group exists, use it. If both exist, alpha = 0.50 when the profile has a confirmed mapped prior role or at least three confirmed descriptor evidences, otherwise 0.30; Fit = alpha × FitDesc + (1 − alpha) × FitTools. If neither group exists, exclude the role as unscorable.

### 7.3 One workload estimator for Reach, plans and paths

Use **all current gap items with c <0.90**, plus unmet transitive prerequisites from the reviewed dependency DAG. Residual coverage is clamp01(1 − c), using the same effective coverage as Fit; an unmet prerequisite with no coverage evidence has residual 1. Deduplicate prerequisites by canonical requirement ID, keeping the highest required level, before selecting resources. Never estimate readiness from only the first twelve displayed recommendations.

1. For each gap/prerequisite, choose the lowest-hours eligible vetted resource that covers it at the required level; deterministic ties by resource ID. Optional alternatives are not counted twice.
2. If the same resource is selected for multiple gaps, count its hours once, multiplied by the **maximum** residual coverage among the gaps it serves. For a prerequisite with no coverage evidence, residual is 1. This is an explicitly labeled workload heuristic, not validated learning science.
3. For uncovered requirements, use default estimated hours × residual: software 20, knowledge 30, essential 15, transferable 15. Label them estimated/uncovered and retain them in the total.
4. H is unique resource workloads plus uncovered estimated workloads. W = H / weekly study hours. Weekly hours must be 1–40, default 8. Plans display rounded schedules but retain this unrounded total.

zoneGap = max(0, target preparation zone − user's confirmed prior-role zone). Only apply when both use the verified same source scale. Do not invent a zone from local degree labels; unknown zone means zero penalty with a visible unknown-preparation warning.

Reach = [1/(1 + W/12)] × 0.6^zoneGap. Mark long reach when W >26 or zoneGap ≥2. The zone penalty is a model heuristic. Licensing, degree duration, work experience and immigration constraints are displayed separately and are **not** claimed satisfied by course hours.

### 7.4 Demand

Use only permitted, age-eligible comparable market snapshots. For the selected country, a cohort consists of all eligible role query snapshots from the same data version, using comparable filters. Require at least ten observations for percentile evidence; disclose sample size.

For role count x in a cohort of N ≥10: P = [number of counts below x + 0.5 × number equal to x]/N. A recorded zero is valid data; missing is not zero. Ties are deterministic. If no adequate cohort, P is unavailable even if a single listing exists.

For available sector growth: divide provider percentages by 100 first (5.2 becomes 0.052). Let g be the mean of up to the last three reported, age-eligible sector-growth observations, using at least one and disclosing years. M = clamp01(0.5 + (g −0.02)/0.10). If a verified next-year GDP forecast exists, add clamp(−0.1, 0.1, (forecast −0.03)/0.2), then clamp01 again. No forecast means no adjustment; no sector data means M is unavailable.

| Available evidence | Demand | Support label |
|---|---|---|
| P and M | 0.7P + 0.3M | High if P snapshot ≤7 days old; otherwise Medium |
| P only | P | High if ≤7 days old; otherwise Medium |
| M only | M | Medium if ≥2 recent sector observations; otherwise Low |
| Neither | 0.5 neutral prior | Low; explicitly No market data, not measured demand |

High is relative support **within this model**, not comprehensive labor-market coverage. BD normally uses M or the neutral prior; show no local job/salary values. SOC-to-sector mapping is coarse and versioned, with documented overrides. Do not manufacture rank changes when regional input is unchanged.

### 7.5 Opportunity and ordering

**Opportunity = 100 × Fit^0.50 × Reach^0.25 × Demand^0.25.** These normalized components must not be replaced with their 0–100 display values inside the formula. Zero component yields zero score.

Sort descending by full-precision Opportunity, then Fit, then lower W, then SOC code. Apply a maximum of three per minor group in top ten; if fewer than ten satisfy the cap, relax one slot at a time in base order and label the relaxation. Roles held for at least one confirmed year are listed separately, not lost. Apply sector/green/reach filters deterministically. Remote preference and the optional interest check do not change astra-v1 weights.

Worked synthetic unit case: Fit =1, W =0, zoneGap =0 and Demand =1 → Reach =1 and Opportunity =100. Fit =0.64, W =12, zoneGap =0, Demand =0.5 → Reach =0.5 and Opportunity ≈56.57. This is a test vector, not a product benchmark.

## 8. Gap plans, JD comparison and paths

### 8.1 Plans

Group gaps as Foundations (essential/transferable), Knowledge and Tools/software. Mark critical prerequisites through the reviewed DAG; projected skills are a separate optional section, never current mandatory requirements. Priority is w × (1−c).

Select/estimate workload using §7.3. Validate dependency endpoints; prerequisites may introduce additional known canonical items. Remove the lowest-confidence **suggested** edge in a cycle, deterministic ties by key. A cycle among approved manual edges is a catalog error requiring repair, not a silently rewritten dependency. Topologically sort; ties use priority then ID. Category order is only a tie preference and cannot override dependencies.

Pack sequential phases up to three weeks of the user's hours and at most four active items. Split an oversized resource across phases with stable segments; never schedule more weekly hours than selected. Prerequisites finish before dependent segments. Display first twelve priority items by default with an All gaps expansion, while the stored complete plan includes the full workload. Date estimate = supplied start date + ceiling(total scheduled hours / weekly hours) ×7 calendar days, calculated consistently in UTC date-only arithmetic. Call it **estimated learning completion**, not job-ready or guaranteed placement date.

Resources must come from the approved catalog. No resource → known-provider search URL constructed by deterministic code and labeled Search results, not vetted, plus uncovered estimated hours. A suggested portfolio milestone comes from a vetted generic template or a grounded draft over public role tasks; it never issues a credential. Progress is owner-scoped and keyed to stable resource/requirement versions; regenerate with a diff rather than erase progress or transfer it to unrelated items.

### 8.2 Pasted job descriptions

Accept text only, redact and process as personal/untrusted. Extract requirements with quotes; normalize locally/permitted processing and let the user confirm unresolved or ambiguous items. Explicit must-have/optional wording controls requiredness; absent proficiency defaults to a disclosed model assumption of 0.50, not an employer fact. No external URL fetch, invented qualifications or salary parsing into general market statistics.

Job-target gaps and plans use the same coverage/workload/sequence logic. A JD score, if displayed, is a labeled requirement-coverage score, not an occupation Opportunity Score unless it separately has valid market inputs. Persist a discriminated plan target so JD plans cannot collide with SOC plans. Delete JD text/requirements with the owner.

### 8.3 Paths and skills graph

Nodes are occupations plus a virtual You start. Directed edges are verified O*NET related occupations union top-ten requirement-vector neighbors with cosine ≥0.75. Unknown relationship tiers get no bonus. Edge reference skill assumptions and source are stored.

- First-hop coverage/workload uses the user's actual confirmed profile.
- Subsequent edge workload uses the source occupation's reference profile: descriptor required levels and software proficiency 0.50. This assumes competence in that role; it does not pretend the user already acquired it.
- Cost = max(1, estimated transition weeks +2 − relatedness bonus), bonus 2 for a verified closest/short tier, 1 for a verified longer primary tier, otherwise 0.
- Use bounded Yen/Dijkstra-style k-shortest simple paths: k=3, at most three edges after You, no repeated occupations, sum of **learning weeks** ≤104. Search cost includes hop overhead; display learning weeks separately so the two are not confused.
- For green lens, choose distinct targets first if available; do not create three cosmetically different copies of one route. Non-linear means target major group differs from the user's confirmed current role group. Unknown current role means unknown non-linearity, not a fabricated label.
- Every edge shows shared requirements and requirements to build, assumptions and origin. Multi-hop paths may cost more than a direct route; do not claim bridging automatically shortens learning.

The skills graph is a separate view of confirmed skills, target requirements and selected resources using the same underlying contracts; it is not a second matching engine. Both graphs have equivalent keyboard/list views. No salary-lift optimization without comparable sourced salary data and an approved model change.

## 9. LLM, retrieval and P2

### 9.1 Task routing

| Task | Data class | Behavior/fallback |
|---|---|---|
| CV/JD extraction | Personal | Approved processor only; evidence verification; manual input on failure |
| Match explanation | Personal | Fact IDs and evidence from the authorized profile; deterministic template fallback |
| Advisor | Personal | Authorized read-only tools; cited answer or explicit inability to answer |
| Public-role milestone/prerequisite drafts | General, offline | Only public taxonomy/catalog input, not a profile-selected skill subset. Review suggestions before use. |
| Public-role outlook | General | Licensed public evidence; validated claims and qualitative scenarios |
| Taxonomy embedding | General | Public reference text only |
| Unrecognized user phrase embedding | Personal | Approved personal-safe adapter or local lookup/manual mapping; never unpaid general fallback |

"Approved processor" for personal rows means paid Gemini under §12.1; with GEMINI_TIER=unpaid, personal rows run on the deterministic local engine (§12.2). Even a short extracted phrase can contain personal information. Removing names or sending a profile-derived subset does not automatically make it general data. Synthetic persona tasks may be processed as explicit synthetic data offline, but public demo browsing never triggers generation.

Every task declares model, prompt version, schema, timeout, token cap, cache scope and deterministic fallback. Use the installed SDK's supported structured-output API. At most one validation retry within the shared deadline; do not stack SDK retries with application retries unintentionally.

Prompt delimiters and control-character stripping are defense in depth, **not** a guarantee against injection. User CV/JD/web content cannot select system instructions, authorize tools, change ownership, execute commands or retrieve arbitrary URLs. Advisor tool arguments are validated and the service supplies owner scope rather than trusting model-provided profile IDs.

Grounding validation checks citation existence **and that each cited record supports the claim**. Reject novel monetary amounts/counts/scores/URLs; use code-rendered factual values rather than relying on numeric-string matching. Unknown reference or unsupported claim → retry within budget, then template/no-answer. For advisor streaming, validate sentence/claim chunks before display or buffer the completed grounded answer; do not stream unvalidated invented facts first and retract later.

### 9.2 Outlook, interests and remote work

Outlook retrieval filters by verified occupation, source/license and vintage, packages a bounded fact set and requires claim-level citations. Historical changes require at least two comparable releases; one release cannot prove a trend. Hot software flags and news mentions are signals only. Show Projection, 5–10 years, qualitative confidence, evidence dates and limitations. No automation-risk percentage without a separately approved validated source/model.

Interest check: twelve approved activity items, two per RIASEC dimension, Likert 1–5. Dimension score = (mean response −1)/4; compare to the occupation's normalized six-dimensional profile using cosine when both norms are nonzero. All-neutral/zero profiles have no meaningful affinity. Show optional affinity separately; **no change to Opportunity in astra-v1**. It is not a validated psychological instrument, diagnostic test or employability filter.

Remote indicator: map available O*NET Work Context fields through a documented reviewed rule into low/medium/high occupational remote suitability. Label US-reference proxy, not actual remote openings in the selected country. Unknown fields → unavailable. Never use it to invent a remote salary or country.

## 10. Reproducibility and cache invalidation

A match run key includes profile revision, confirmed skills/experience, country/preferences, data version, scoring version and market snapshot IDs. Plan keys also include target/JD revision, catalog/prerequisite version, hours, start date and progress version. Paths include graph version and constraints. Personal model cache keys include owner profile, task, model, prompt version and input hash.

Mutating skills/preferences increments the revision; recomputation publishes only if its input revision still matches. Discard stale in-flight results. Country previews for demos use immutable scenario IDs; no user-specific data enters a shared cache. Reference in-memory caches are keyed by data version and bounded in size.

Evaluation: twenty synthetic CVs with independent graded roles and gold canonical skills, frozen before tuning. Use a recorded tuning/holdout split, identical candidate filters for BM25 and VectorPath, fixed market/taxonomy snapshots and deterministic metric code. Report Precision@5 (grade≥1), NDCG@10 with graded gains and MRR, plus micro/macro extraction precision/recall. Exclude manual/role-inferred items from claims of extracted-skill accuracy. Offline evaluation reads actual captured model outputs; perfect fixture mocks prove plumbing only. Capturing new real-provider outputs is a separate explicitly approved budgeted command, never an automated test.

## 11. Invariants — acceptance audit IDs

- **I01:** Free-tier/terms eligibility verified before live use; no unauthorized service or license bypass.
- **I02:** One canonical tree, dependency direction and source of formulas.
- **I03:** Scores/plans/paths are pure, deterministic, versioned and explainable.
- **I04:** External facts, derived estimates, projections and unavailable values remain distinct with honest provenance.
- **I05:** Personal input never reaches an unapproved/general unpaid model or embedding endpoint.
- **I06:** Every private read/write is owner-scoped; demos are immutable; CSRF and expiry are enforced.
- **I07:** Uploaded file bytes are never persisted; minimized personal text and private caches have export/deletion/retention coverage.
- **I08:** CV/JD extraction requires verified quotes; inference and self-report are separate.
- **I09:** Provider budgets and caches are atomic, bounded, dated and license-aware.
- **I10:** Persona browsing and automated tests make no live third-party calls.
- **I11:** Missing facts/resources/coverage are not fabricated; synthetic fixtures cannot masquerade as market data.
- **I12:** Streams and retries obey request deadlines; bulk work stays offline.
- **I13:** Vector identity, dimensionality and privacy policy are consistent.
- **I14:** Graph/plan estimates use the canonical workload model and do not claim legal/hiring readiness.
- **I15:** Untrusted content cannot authorize tools or override policy; generated claims are validated before display.
- **I16:** Source/benchmark inputs and applied migrations are protected; material model changes need approval and evaluation.
- **I17:** UI is dark, tokenized, accessible and complete in loading/empty/error/no-data/stale states.
- **I18:** A unit is complete only after actual review, integrated verification and recorded evidence.

## 12. Owner decisions — free demo mode (2026-10-20)

The project owner confirmed VectorPath is a **non-commercial buildfest demonstration**. Everything runs at $0 on unpaid tiers, open datasets and deterministic local fallbacks. One paid Gemini key may be added through the environment before the live event; switching to it changes configuration only, never application code. These decisions supersede earlier text where they conflict; verification evidence is in [`docs/verification/providers.md`](docs/verification/providers.md).

### 12.1 One model switch: GEMINI_TIER

- GEMINI_TIER is unpaid (default) or paid, with GEMINI_API_KEY. The personal processor is **paid Gemini only when GEMINI_TIER=paid, a key is present and LLM_MODE=live**. In every other combination, personal tasks use the deterministic local engine in §12.2. Configuration is validated once in [`lib/config/env.ts`](lib/config/env.ts); [`lib/llm/`](lib/llm/) reads the resolved mode and never branches on raw environment strings.
- **Unpaid tier:** general, public, non-personal tasks only — offline seed-time reference embeddings and public-role outlook drafts from the curated public corpus. Request handlers serving users never call the unpaid tier, because the unpaid terms forbid UK/EEA-facing use and personal data. A token bucket caps calls at 10 per minute; HTTP 429 falls back to the committed precomputed output, otherwise unavailable.
- **Paid tier:** CV/JD extraction, match explanations and the advisor for all regions, including GB, through the same Zod task schemas, quote verification and grounding validation. The generation model is gemini-2.5-flash, availability rechecked when the key is added.
- Groq stays optional and disabled: PERSONAL_LLM_ENABLED=false. Paid Anthropic/OpenAI, paid queues and other paid services are not used.

### 12.2 Deterministic local engine (personal processing without a model)

- Text comes from the bounded in-memory parsers in §6.2. Extraction uses token/n-gram matching of the minimized text against canonical O*NET (and lawfully obtained Lightcast sample) names and approved aliases, plus deterministic patterns. Every candidate therefore carries an exact quote span. Candidates still require user confirmation and are labeled as local text matching.
- Match explanations, JD gap summaries and plan sequencing use deterministic templates over typed facts. No generated claim is shown without a source fact.
- Local-engine quality is measured on the same frozen benchmark; there is no accuracy claim without that result. Public demos use only synthetic persona CVs.

### 12.3 Embeddings

- Reference model: gemini-embedding-001, 768 dimensions, task type SEMANTIC_SIMILARITY, with **manual L2 normalization** before storage or query, implemented in [`lib/embeddings/`](lib/embeddings/) — the boundary rule keeps embeddings out of [`lib/llm/`](lib/llm/). text-embedding-004 and embedding-001 are shut down and never used.
- Public reference vectors are computed offline once on the unpaid tier, because they contain public data only. They are committed with a manifest (model, dimension, task type, normalization, text hashes) under [`data/embeddings/`](data/embeddings/), so seeding and runtime need zero API calls.
- Offline fallback identity local-hash-ngram-v1: character n-gram feature hashing into 768 dimensions, L2-normalized. It is a **separate embedding identity** — never mixed with Gemini vectors in a column, index or comparison — and its candidate thresholds are benchmarked separately. It represents lexical, not semantic, similarity.
- Runtime personal phrases never reach the unpaid tier. In unpaid mode, unresolved user phrases use exact/fuzzy lookup or the local hash identity; in paid mode they may use the paid embedding endpoint.

### 12.4 Infrastructure

- Database: local Docker PostgreSQL with pgvector for development and tests; Neon Free (aws-ap-southeast-1) for deployment. Seeded vectors plus indexes stay **≤150 MB**, using a curated canonical O*NET 31.0 occupation/skill set, measured by npm run db:size.
- Prisma 7.10.1 exactly. Extensions are created in migration SQL (CREATE EXTENSION IF NOT EXISTS vector / pg_trgm), not the deprecated postgresqlExtensions preview. Vector columns are Unsupported("vector(768)"), queried only through parameterized raw SQL/TypedSQL in [`lib/db/vector.ts`](lib/db/vector.ts). [`prisma.config.ts`](prisma.config.ts) loads environment explicitly with dotenv (.env.local).
- Next.js 16.4.2 uses [`proxy.ts`](proxy.ts) (exported proxy, Node runtime) for headers only; every server action and route handler still verifies session/access itself. npm run lint is standalone because next build no longer lints.
- Hosting: Vercel Hobby, region sin1, non-commercial confirmed.
- Uploads: 4,000,000-byte cap, parsed **in memory** only. The owner allowed in-memory or ephemeral /tmp; in-memory is chosen because it satisfies the no-stored-file rule without disk residue. No blob storage.
- Jobs: work remains bounded within the request (§6.2), with status in the AnalysisRun table. No Inngest, Redis or paid queue. In-process work after a serverless response is not relied on.

### 12.5 Data sources at $0

| Source | Free demo behavior |
|---|---|
| O*NET 31.0 | Free public download. Footer/source-badge attribution, verbatim: *This page includes information derived and modified from the O\*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O\*NET® is a trademark of USDOL/ETA. USDOL/ETA has not approved, endorsed, or tested these modifications.* |
| Lightcast Open Skills | Fixture mode by default; no runtime extraction endpoint; CV text never sent. The sample must be lawfully obtained through free Open Skills registration and attributed with a link to https://legal.lightcast.io/lightcast-legal/open-terms-of-use. Without it, canonical skills come from O*NET and Lightcast coverage shows unavailable. |
| Adzuna | Fixture client when ADZUNA_APP_ID/ADZUNA_APP_KEY are unset; fixtures are real recorded responses only, otherwise unavailable. With keys: hard caps 20/minute and 200/day (lower of these and the verified account quota). Hyperlinked "Adzuna" badge on job counts, "Adzuna Jobsworth" on salary estimates (exact wording checked against Adzuna terms in U12). BD returns unavailable with: *Adzuna does not publish localized job/salary feeds for BD; showing regional World Bank macroeconomic data only.* |
| World Bank | WDI source 2 (vintage 2026-10-08) and GEP source 27, indicator NYGDPMKTPKDZ (vintage 2026-06-11), with cached seed fallbacks. USA sector series stay null: *Sector breakdown unavailable in WDI for USA*. GBR has no GEP series: *GEP forecast unavailable for GBR*. Never 0%. GEP years after 2025 are labeled Projections. Attribution: World Bank, WDI / GEP, CC BY 4.0. |
| Industry news corpus | Curated, pre-filtered local JSON corpus of public tech/labor-shift articles plus historical O*NET task deltas, embedded at seed time, for cited 10-year role outlooks. Each entry records URL, publisher, date, usage/license basis and a short excerpt; no bulk Common Crawl download. Entries are real, attributable articles — never generated. |

Recorded fixtures live under [`data/fixtures/`](data/fixtures/) per provider, with provenance manifests, as §4 requires.
