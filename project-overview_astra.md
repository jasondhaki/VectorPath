# VectorPath — Project overview

## 1. Identity and purpose

**VectorPath** is our AI career-intelligence buildfest product. **Career Navigator is the event topic, not the product name.** Keep the application name in one configuration constant in [`lib/config/site.ts`](lib/config/site.ts).

The brief asks for **higher placement and relevance** through a skills graph, labor-market data and matching. VectorPath turns a CV or manually entered skills into evidence-backed recommendations, understandable gaps, non-linear transition paths and a practical plan using free learning resources.

- **Relevance:** recommendations reflect the person's confirmed skills and show why they fit.
- **Placement:** recommendations account for preparation effort and available regional demand evidence.
- **Honesty:** a recommendation score is not a probability of employment; a learning estimate is not a hiring promise.

Audience: students, graduates, career switchers and workers whose roles are changing. Bangladesh is a first-class launch market, not a fabricated extension of US job data. Launch countries are **BD, IN, GB and US**. Remote work is a preference with coverage limitations, **not a country or a synthetic World Bank region**. The UI is English; vetted Bangla learning-resource titles are allowed.

## 2. Product decisions

| Area | Implementation requirement |
|---|---|
| Access | Public read-only demos and secure guest-owned profiles. Accounts are conditional P2, never a prerequisite. No development authentication bypass. |
| CV processing | Parse files in memory; store minimized text/derived records only; no blob/queue/Redis requirement. Heavy imports run offline. |
| Matching | One deterministic weighted geometric Fit/Reach/Demand model. Embeddings help normalization, not a duplicate score. |
| Countries | BD, IN, GB, US at launch. Additional markets require verified provider coverage and a scope decision. |
| Interests | Evidence-backed transferable skills plus optional 12-item RIASEC interest check. No Big Five inference or validated-assessment claim. |
| Outlook | Cited 5–10-year scenarios from licensed occupational facts and a curated local public-news corpus ([architecture §12.5](architecture_astra.md)). No bulk Common Crawl ingestion or unsupported automation percentages. |
| Cost model | Non-commercial buildfest demo at $0: unpaid tiers, open datasets and deterministic local fallbacks; one optional paid Gemini key at the final stage via configuration only ([architecture §12](architecture_astra.md)). |
| Interface | One accessible dark wayfinding system; transit paths, ranked rows, comparison strips, semantic skill states and evidence inspectors. |
| Fallback data | Production fixtures must be permitted recorded data with original dates. Synthetic data is restricted to clearly identified tests and fictional people. |
| Extraction quality | Acceptance: recall ≥85%, precision ≥80%; stretch: recall ≥90%, precision ≥85%. Measure against the frozen evaluation corpus. |

Verify current versions, dataset schemas, provider quotas, free plans and licensing against official documentation in U00/U06. Do not hard-code a dataset size or import columns without inspection.

## 3. Feature priorities and traceability

**The complete submission target is P0 + P1 + P2**, except explicitly conditional accounts. Priorities establish build order. P0 and P1 are mandatory. A P2 cut needs the project owner's approval and a visible tracker record; an unfinished flag is not a completed feature.

| Requirement | Priority | Deliverable | Acceptance / units |
|---|---|---|---|
| R01 No-sign-in discovery | P0 | Landing and four fictional read-only personas; manual guest entry | A01; U04, U20, U25 |
| R02 Evidence-backed intake | P0 | PDF/DOCX/TXT, redaction, extraction, normalization, editable review | A02–A03; U18–U21 |
| R03 Explainable matching | P0 | Fit, Reach, Demand, evidence, diversity, confidence and calculation version | A04; U14–U15, U22–U23 |
| R04 Gap-to-learning workflow | P0 | Complete prioritized gap matrix, prerequisites, free resources, progress, portfolio work | A05; U13, U16, U24 |
| R05 Market context and jobs | P0/P1 | Budgeted Adzuna where licensed/covered; World Bank regional proxy | A06; U11–U12, U30–U31 |
| R06 Skills graph and green paths | P1 | Skills/roles/resources inspection and up to three justified transition routes | A07; U09, U28–U29 |
| R07 Specific-job comparison | P1 | Paste a job description, review extracted requirements, compare and plan | A08; U33 |
| R08 Trust and empirical relevance | P0/P1 | Attribution, methodology, frozen benchmark and BM25 comparison | A09; U26, U32 |
| R09 Privacy and portability | P0 | Consent, JSON export, owner isolation, cascading deletion, retention | A10; U04, U19b, U26 |
| R10 Future outlook | P2 | Cited 5–10-year scenario with horizon, limitations and confidence | A11; U34 |
| R11 Interest-based exploration | P2 | Optional 12-item RIASEC quick check and separate affinity display | A11; U35 |
| R12 Grounded cross-cultural advisor | P2 | Read-only Q&A over authorized profile and regional facts, with references | A11; U36 |
| R13 Remote and plan portability | P2 | Occupational remote-suitability proxy; Markdown and print plan export | A11; U37–U38 |
| R14 Optional accounts | Conditional P2 | Approved free authentication and explicit guest-profile claim | U39, only after feasibility/security approval |

## 4. Core journey

1. **Discover:** open a demo profile or choose Analyze my CV / Enter skills manually. No mandatory sign-in.
2. **Understand privacy:** see what is sent to which approved processor, what remains stored, retention and deletion. Manual entry remains available without model processing.
3. **Upload:** PDF, DOCX or TXT, **maximum 4,000,000 bytes**. Show actual stages, not a fabricated progress percentage. Encrypted/scanned/invalid documents get an actionable fallback; no OCR promise.
4. **Review:** inspect skill/experience evidence, distinguish occupation-inferred suggestions from CV extraction, confirm proficiency, remove errors and map unresolved names. Final matching uses confirmed inputs; provisional results, if shown, are clearly labeled.
5. **Set preferences:** country, study hours per week (default 8, allowed 1–40), remote interest and sector interests.
6. **Explore opportunities:** ranked roles with Fit/Reach/Demand, skills already covered and to build, learning-effort estimates and sourced market facts. Show thin-data limitations beside results.
7. **Inspect a role:** requirement matrix, evidence, grounded explanation, education/preparation notes, market facts and job listings if permitted and available.
8. **Build a plan:** all known gaps remain visible. Present phased free resources, prerequisites, estimated learning dates, project milestones and progress. An initial recommended subset must not be called a complete readiness plan.
9. **Explore paths:** compare direct and multi-hop routes, shared skills and additional learning effort. Green-energy lens highlights real resolved occupations; paths are modeled suggestions, not observed career outcomes.
10. **Compare a specific job:** paste text rather than asking the app to scrape a URL; review requirements before computing the job-specific gap and plan.
11. **Extend:** view a labeled outlook, optional interests or grounded advisor; export a plan or all personal data; delete guest-owned data at any time.

## 5. Source strategy

| Source | Intended use | Honest constraints |
|---|---|---|
| O*NET database | Occupations, requirements, titles, relationships, tasks, education, interests and work context | US taxonomy used as a skills reference. Pin a verified release and scale definitions; do not equate preparation zones with local licenses. |
| Lightcast Open Skills | Granular canonical names and aliases | Free access and redistribution/storage terms must be checked. No paid labor-market analytics. Missing permission is not solved by copying an unlicensed fixture. |
| Adzuna | Search-based posting counts, listing salary fields and supported statistics in IN/GB/US | Query-based sample, not total vacancies or placement outcomes. One team account; quotas, attribution and aggregation permissions verified before public use. No BD job-ad coverage is assumed. |
| World Bank WDI and verified GEP series | Annual sector-growth context and available country-level forecasts | Macro context is a proxy, not occupation demand measurement. Actual period and forecast vintage remain visible; unavailable forecasts stay unavailable. |
| Curated learning catalog | Free-access resources and realistic workload metadata | Reachability is not proof of free access. Audit/certificate costs and geographic restrictions must be disclosed. |
| Curated public news corpus (owner-approved 2026-10-20) | Cited supporting trend signals for outlook | Confirm terms; never equate popularity with employment growth. No bulk Common Crawl ingestion. |

Every externally sourced fact has its provider, source/version, original fetch date, observed period where relevant, and mode. Every calculated score/estimate has its calculation version, inputs and assumptions. Do not pretend VectorPath's own score was supplied by Adzuna or O*NET.

## 6. Demo personas

All four are fictional. Create the CVs and preferences under [`data/personas/`](data/personas/) before U25, with project-owner approval.

| Persona ID | Profile | Demonstration |
|---|---|---|
| student-dhaka | Final-year CSE student with Python, SQL and React projects; no full-time history | First-role matching from evidence rather than job title; BD sparse-data honesty |
| technician-chattogram | Gas-plant maintenance technician, eight years | Transferable industrial skills and non-linear green-energy paths |
| teacher-manchester | Secondary-school chemistry teacher, six years | Teaching-to-industry transition and posting-backed GB comparison |
| retail-bengaluru | Retail supervisor, five years | Evidence-backed transferable skills into operations/analysis |

Persona browsing makes **zero live third-party API or model calls**. Snapshot each supported persona/country scenario, its rankings, explanations, plans, paths and approved job-listing snapshots. Demo country switching selects a snapshot and never edits the shared persona. Study-hour experiments are local previews; saving progress or copying a persona requires an explicit guest-owned copy. Unprepared detail pages use pure calculations over reference data or show unavailable content, never a hidden live call.

## 7. Submission acceptance

| ID | Testable acceptance |
|---|---|
| A01 | A reviewer reaches a persona's opportunities in at most two clicks without login. Third-party network is blocked on both browser and server during persona E2E; only the app and isolated database remain reachable. |
| A02 | Valid CV analysis reaches an editable review state within 60 seconds p95 under the documented test workload. A fast-path 15–30 seconds is a stretch goal. Parser/model failure offers manual entry without fictional extraction. |
| A03 | Every extracted displayed item has a verified quote. Manual entries and occupation inferences have distinct labels. Frozen-corpus extraction recall ≥85% and precision ≥80%, measured from recorded real-provider outputs on synthetic CVs, not perfect mocks. |
| A04 | With at least ten eligible reference occupations, show at least ten recommendations; no more than three from one minor occupation group in the top ten where feasible. Never invent coverage or force three covered skills for an empty/weak profile. Explain fewer results. All score components and data confidence are inspectable. |
| A05 | Cached gap/plan core renders within ten seconds. Every recommended learning item has a vetted free resource or an explicitly unvetted search fallback; all gaps and uncovered hours remain visible. Changing weekly hours changes the learning estimate consistently. Progress survives owner reload. |
| A06 | Regional input is included in recalculation/cache keys. Country changes use the actual available evidence; rank order is allowed to remain unchanged when inputs warrant it. At least one frozen scenario demonstrates different regional ordering. BD never displays invented postings or local salary estimates. |
| A07 | The curated technician persona has three distinct valid green-target routes, at most three occupation transitions and at most 104 estimated learning weeks. At least one is multi-hop and non-linear. General users receive up to three; insufficient routes produce an honest state, not forced paths. Graph and list views convey equivalent evidence. |
| A08 | A pasted JD produces a reviewable canonical requirement list with supporting quotes, explicit unresolved requirements, a deterministic gap report and a job-target learning plan. No URLs are fetched and no model-invented salary/credential requirements are accepted. |
| A09 | Methodology reads committed ranking and extraction results. Compare Precision@5, NDCG@10 and MRR against BM25 on the same candidate set/snapshots. The target is improvement in Precision@5 and NDCG@10; report actual values and limitations even if the target is missed. |
| A10 | Owner-only JSON export excludes credentials/internal logs. Delete my data removes all profiles owned by that session and all derived/private cache records; other guests and public personas survive. Expired guest data is inaccessible even before maintenance cleanup. Automated isolation/deletion tests pass. |
| A11 | Enabled P2 features meet U34–U38 acceptance: cited projections, optional non-diagnostic interest results, grounded authorized advisor, labeled remote proxy and authorized exports. Unsupported P2 is disabled and explicitly recorded, never presented as complete. |
| A12 | Typecheck, lint, unit/integration tests and production build pass; affected E2E and accessibility checks pass. No test calls a live model/data provider. Provider terms, quota evidence, deploy smoke test and submission checklist are recorded. |

Latency measurements must identify sample count, cold/warm behavior, model mode, environment and source version. A one-off local measurement is not p95 evidence.

## 8. Out of scope and safeguards

- LinkedIn scraping, job-board scraping against terms, importing a LinkedIn URL, automatic applications, ATS/employer dashboards.
- Paid hosting, APIs, domains, learning checkout or tuition; adding a service requires approval even if a free tier exists.
- Big Five/personality guesses, psychological diagnosis, guaranteed employment, calibrated placement probabilities or unsupported automation-risk percentages.
- Visa/migration advice, salary-negotiation guarantees, invented career-transition outcomes and country-level cultural stereotypes.
- Native apps, light mode, non-English application UI, voice and wholesale Common Crawl processing.
- Real people's CVs in source control, demo snapshots, tests, evaluation or agent messages.

Soft-skill evidence is not personality. Education fields are typical occupational preparation, not legal eligibility. Career forecasts are scenarios, not measured future facts. Missing coverage remains a visible limitation.

## 9. Source-of-truth responsibilities

- This document defines product scope and acceptance.
- [`architecture_astra.md`](architecture_astra.md) defines algorithms and data contracts; do not duplicate competing formulas elsewhere.
- [`ui-context_astra.md`](ui-context_astra.md) defines visuals and content rules.
- [`progress-tracker_astra.md`](progress-tracker_astra.md) identifies pending work and unresolved human/provider checks.
- [`project-file-tree.md`](project-file-tree.md) decides file placement; [`claude-agents_astra.md`](claude-agents_astra.md) decides write ownership and collaboration.
