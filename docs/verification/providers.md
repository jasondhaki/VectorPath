# U00 provider and permission verification log

- Unit: U00, "Verify assumptions and operating permissions"
- Author: vp-scribe (agent). Date checked for every item: **2026-10-20**
- Method: official vendor docs, terms, dataset pages, npm registry and public World Bank API responses only. No account was used and no secrets were read.
- Status vocabulary: `verified` (official text confirms it) · `unavailable` (the source says no, or the data is absent) · `blocked — human` (needs an account, a signed agreement, an approval or a judgement call) · `unresolved` (the official public text is silent or ambiguous).
- The research below does not itself grant permission. Permissions come from the owner sign-off section, which is now in force.

## Owner sign-off — 2026-10-20 (free demo mode)

The project owner signed off every former `blocked — human` item under one rule: **VectorPath is a non-commercial buildfest demonstration. Everything runs at $0 on unpaid tiers, open datasets and deterministic local fallbacks. One paid Gemini key may be added through `.env` before the live event; switching `GEMINI_TIER=paid` must need no application-code change.** Full decisions: [architecture_astra.md §12](../../architecture_astra.md).

Owner sign-off resolves *decisions* (eligibility, which processor is allowed, what runs in fixture mode). It does not change *facts*: anything only an account or a lawful download can provide is listed under "data precondition". Until a precondition is met, the affected feature shows its documented `unavailable` state. No unit is blocked.

## Summary

| # | Item | Status | Data precondition (not a blocker) | Owner / unit |
|---|---|---|---|---|
| 1 | Event deadline/format (Q01) | verified (owner signed off — free demo mode): non-commercial buildfest; final paid-Gemini switch allowed | Deadline date and submission destination still unrecorded; ask before U41 | Owner / U41 |
| 2a | Node.js LTS | verified | Node 24 (Krypton) pinned; re-check Node 26 LTS (2026-10-28) before release | Lead / U01 |
| 2b | Next.js 16.4.2 + `proxy.ts` | verified | — | Lead / U01 |
| 2c | Prisma 7.10.1 + pgvector | verified | Never install `@latest` (8.0.0-rc.23) | Backend / U03 |
| 2d | AI SDK `ai@7.0.146` + `@ai-sdk/google@4.0.101` | verified (installed, matched provider packages) | — | Domain / U17 |
| 3 | O*NET 31.0 | verified — CC BY 4.0, modified-data attribution recorded | Download release files at U06 | Data / U06 |
| 4 | Lightcast Open Skills | verified (owner signed off — free demo mode): fixture mode by default; no runtime extraction calls; CV text never sent | The bundled sample must be lawfully obtained via a free Open Skills registration (human fills the form). Until then canonical skills come from O*NET only and Lightcast coverage reads "unavailable" | Data / U07 |
| 5 | Adzuna API | verified (owner signed off — free demo mode): free developer tier, non-commercial; caps 20/min and 200/day; "Adzuna" attribution; BD unavailable | Free developer key (human registers). Fixtures must be real recorded responses captured with that key; without a key, market listings/counts show "unavailable" | Data / U12 |
| 6 | World Bank WDI + GEP | verified (partial data) | USA sector series and GBR GEP forecast stay null with explicit messages | Data / U11 |
| 7 | Groq | verified (owner signed off — free demo mode): **not used**; `PERSONAL_LLM_ENABLED=false`; optional only | — | Domain / U17 |
| 8 | Gemini API | verified (owner signed off — free demo mode): `GEMINI_TIER=unpaid` (default) → public, non-personal, offline tasks only; `GEMINI_TIER=paid` + key → personal tasks in all regions incl. GB | Paid key added by owner at final stage only | Owner + domain / U17 |
| 9 | Neon Free plan | verified (owner signed off): `aws-ap-southeast-1`; seeded vectors + indexes budget ≤150 MB; local Docker pgvector for development | Neon project created by human when deploying (U27) | Backend / U03, U27 |
| 10 | Vercel Hobby plan | verified (owner signed off — non-commercial confirmed): region `sin1`; uploads ≤4,000,000 bytes | — | Lead / U27 |

---

## 1. Event deadline and format (Q01)

- Source: none. This is not public provider information.
- Status (research): **blocked — human** → resolved by the owner sign-off of 2026-10-20 (see top). Owner: project owner.
- Next action: the owner records the deadline, submission format, reviewers, team and the rules on code written before the event in the tracker (Q01). No date or submission destination is invented.

## 2. Runtime and framework versions

### 2a. Node.js
- URLs: https://nodejs.org/en/about/previous-releases · https://raw.githubusercontent.com/nodejs/Release/main/schedule.json (official release schedule)
- What the sources say: v24 "Krypton" is LTS, with Active LTS from 2025-10-28 and Maintenance from **2026-10-20**; it reaches end of life on 2028-04-30. v22 "Jod" is in Maintenance until 2027-04-30. v26 is "Current" and is scheduled to become LTS on **2026-10-28**. The site says production applications should use only Active LTS or Maintenance LTS releases.
- Applicability: As of today, v24 is moving from Active to Maintenance LTS, and v26 is not LTS yet. Pin **Node 24.x** (it satisfies Next 16, Prisma and AI SDK 7). Re-evaluate Node 26 after 2026-10-28.
- Status: **verified**. Owner: lead (U01). Next action: set `engines.node` and `.nvmrc` in U01.

### 2b. Next.js
- URLs: https://registry.npmjs.org/next/latest · https://nextjs.org/docs/app/getting-started/installation · https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- What the sources say: `latest` = **16.4.2**, with `engines.node` `>=20.9.0`. The docs say "Minimum Node.js version: 20.9". On `proxy.ts`, the docs say "The `middleware` file convention is deprecated and has been renamed to `proxy`" (version history: v16.0.0). The proxy defaults to the Node.js runtime, and "Setting the `runtime` config option in Proxy will throw an error." The docs also warn: "Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone." Since Next 16, `next build` no longer runs the linter, so lint runs as a separate script.
- Status: **verified**. Owner: lead (U01). Next action: name the file `proxy.ts` and export `proxy`. Origin/CSRF checks also run in each handler or action.

### 2c. Prisma
- URLs: https://registry.npmjs.org/-/package/prisma/dist-tags · https://www.prisma.io/blog/prisma-orm-8-closes-330-most-requested-issues · https://www.prisma.io/docs/postgres/database/postgres-extensions · https://www.prisma.io/docs/orm/v6/prisma-schema/postgresql-extensions · https://www.prisma.io/docs/orm/reference/prisma-config-reference
- What the sources say:
  - dist-tags: `latest` = **8.0.0-rc.23** (a release candidate) and `prev` = **7.10.1**. The Prisma blog (2026-10-12) says: "Prisma 8 is a release candidate and we expect it to be Generally Available later this year." `prisma@latest` therefore installs a pre-release.
  - pgvector: Prisma has no native `vector` type in 7.x. The Postgres extensions doc maps the column to `Unsupported("vector")` and uses "customized migrations and raw SQL or TypedSQL". The `postgresqlExtensions` preview feature was "deprecated in v6.16.0", so `CREATE EXTENSION` goes in migration SQL. Prisma Studio cannot read tables with `vector` columns. Prisma 8 adds an `@prisma/orm-extension-pgvector` package, but it is RC only.
  - `prisma.config.ts` configures the CLI, and `datasource.url` is required there. The docs say: "Environment variables from `.env` files need to be loaded explicitly" (e.g. `import "dotenv/config"`).
- Status: **verified** (with caveat: the `latest` tag is an RC). Owner: lead/backend (U01/U03).
- Next action: pin `prisma` and `@prisma/client` to an exact **7.x** version (7.10.1). Do not install `@latest`. Use `Unsupported("vector(768)")` with parameterized `$queryRaw`/TypedSQL in `lib/db/`. Load `.env.local` explicitly in `prisma.config.ts`. Expect `db:studio` to fail on vector tables.

### 2d. Vercel AI SDK
- URL: https://registry.npmjs.org/ai/latest
- What the source says: `latest` = **7.0.146**, with `engines.node` `>=22`.
- Status: **verified**. Owner: lead (U01). Next action: pin `ai@7.x` and its provider packages; use v7 APIs, not v4/v5 snippets.

## 3. O*NET database (Q03)

- URLs: https://www.onetcenter.org/database.html · https://www.onetcenter.org/db_releases.html · https://www.onetcenter.org/license_db.html · dictionary e.g. https://www.onetcenter.org/dictionary/31.0/excel/
- What the sources say:
  - The current release is **O*NET 31.0, August 2026**. The previous release was 30.3 (May 2026). The site was updated 2026-10-06.
  - Formats: Excel, CSV and JSON (per file or as a ZIP); SQL for MySQL/PostgreSQL/MariaDB, SQL Server and Oracle; RDF (JSON-LD, N-Triples, RDF/XML, Turtle); plus Web Services.
  - Data dictionary: there is one per format, under `/dictionary/31.0/<format>/`, with a page per file.
  - License: "licensed under a Creative Commons Attribution 4.0 International License" (CC BY 4.0). This covers only the downloadable database files; the rest of the site uses different licenses.
  - Required attribution: "This page includes information from the O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of USDOL/ETA." If the data is modified, a different credit is required: it must note the changes and say USDOL/ETA has not approved or endorsed them. VectorPath derives data, so it needs this modified-data credit.
- Status: **verified**. Owner: data (U06).
- Next action: import 31.0 and record checksums and actual counts in `data/config/sources.json`. Store the modified-data attribution text from license_db.html verbatim. Do not hard-code row counts.

## 4. Lightcast Open Skills (Q04)

- URLs: https://legal.lightcast.io/lightcast-legal/open-terms-of-use · https://docs.lightcast.io/lightcast-api/docs/api-access · https://lightcast.io/open-skills/access
- What the sources say:
  - Open Terms of Use, v2.0, last updated 2026-10-01:
    - §2.1: "You may copy and redistribute all or part of the Datasets in any medium or format."
    - §2.3: "Commercial or for-profit purposes may be permitted provided the user contacts Lightcast and enters into a written contract."
    - §3.2: "You can't redistribute all or any part of the Lightcast Materials as your own work."
    - §4: "you must attribute Lightcast as the source of the Datasets, and provide a link to this license."
    - §5–6: Lightcast may rate-limit calls and "cancel or suspend access … at any time, for any reason."
    - The terms say nothing about storage or caching.
  - API access docs: free "public-good" access uses the scope `lightcast_open_free` and "Includes up to 50 skill extraction API calls per month". It "Is not intended for production-scale workloads", and "A commercial license is required for for-profit or production use cases."
  - Access is by request form only ("Fill out the form to request access").
- Some skill descriptions come from Wikipedia under CC BY-SA, per a search snippet. That point is **unresolved** because the source page was not fetched.
- Status (research): **blocked — human** → resolved by the owner sign-off of 2026-10-20 (see top). Access requires the application form, and someone must decide whether a public buildfest deployment counts as "production".
- Owner: project owner + data (U07).
- Next action: the human submits the access request and records the granted scope. Until then, U07 uses a lawful minimal sample with labeled limited coverage. Keep skill extraction off the 50/month free endpoint; personal CV text must never go to Lightcast without a separate approval.

## 5. Adzuna API (Q05)

- URLs: https://developer.adzuna.com/overview · https://developer.adzuna.com/docs/terms_of_service · https://developer.adzuna.com/docs/search · https://developer.adzuna.com/docs/regional
- What the sources say:
  - Quotas: no public numbers. The terms say "The plans available to you, and their limits, are shown in your account" and "We may vary limits from time to time."
  - Attribution: each ad must be labeled "Adzuna", at least 116×23 px, with the word hyperlinked to adzuna.co.uk or the local domain. Salary estimates need a 20×20 px icon plus the words "Adzuna Jobsworth". Research use must cite "The Adzuna API".
  - Display: users are "encouraged to publish Adzuna listings, salary estimates and/or data", provided they follow the attribution rules.
  - Storage: no caching or retention period is stated. On termination a user "shall immediately remove all insertion codes and data acquired from Adzuna."
  - Commercial use: commercial, government and academic organizations get a **14-day trial**. After that, "a licence agreement is required" for revenue- or lead-generating products. Commercial analysis or resale requires a written agreement.
  - Countries: the public docs only show `gb` in examples. A search snippet of Adzuna's XML upload specification lists 19 countries: AU, AT, BE, BR, CA, CH, FR, DE, ES, IN, IT, MX, NL, NZ, PL, SG, ZA, UK, US. BD is not on that list. The page returned HTTP 403 to fetch, and it is an upload spec, not an API reference. Unauthenticated probes of `/jobs/{bd,in,gb,us}/search/1` all return 400, which tells us nothing.
- Status (research): **blocked — human** → resolved by the owner sign-off of 2026-10-20 (see top). Country support is **unresolved**: BD is likely unsupported and IN/GB/US likely supported, but this is not confirmed by an official API reference.
- Owner: project owner (Q05) + backend (U12).
- Next action: the human registers one team account and records the limits shown in it. Set `ADZUNA_LIMIT_*` at or below those limits (application caps after the owner decision: 20/min, 200/day, 900/week, 2,300/month). Confirm the country enum in activedocs after logging in. Decide whether the project is a commercial organization; if so, the 14-day trial applies. Implement the Adzuna attribution label. BD market data is treated as unavailable unless an official list says otherwise.

## 6. World Bank WDI and GEP (Q07)

- URLs: https://api.worldbank.org/v2/sources?format=json · `https://api.worldbank.org/v2/country/BGD;IND;GBR;USA/indicator/{id}?format=json&source=2` · `https://api.worldbank.org/v2/sources/27/indicators?format=json` · https://datacatalog.worldbank.org/search/dataset/0037712/World-Development-Indicators · https://datacatalog.worldbank.org/search/dataset/0037798/Global-Economic-Prospects
- What the sources say (live API responses read on 2026-10-20):
  - WDI is source id **2**, last updated **2026-10-08**. GEP is source id **27**, last updated **2026-06-11**.
  - NV.AGR.TOTL.KD.ZG, NV.IND.TOTL.KD.ZG, NV.SRV.TOTL.KD.ZG: BGD, IND and GBR have values through **2025**. **USA has no values at all from 2000 to 2025** (all `null`), so this is **unavailable**.
  - NY.GDP.MKTP.KD.ZG has 2025 values for all four countries (e.g. USA 2.16, IND 7.57, BGD 3.49, GBR 1.39).
  - GEP (source 27) has one indicator: **NYGDPMKTPKDZ**, "GDP growth, constant (average 2010-19 prices and exchange rates)". BGD, IND and USA have values for 2024–2028 (e.g. IND 2026 6.6, 2027 7.2, 2028 7.0). **GBR returns no GEP data.** The API metadata does not say which years are forecasts. The vintage is the source update date (2026-06-11, the June 2026 GEP edition).
  - License: both catalog entries say "License: Creative Commons Attribution 4.0". The GEP catalog was last updated 2026-10-02.
- Status: **verified**, with partial data. USA sector growth and GBR GEP are **unavailable**.
- Owner: data (U11).
- Next action: seed with stored vintage dates. USA sector signals and the GBR forecast stay absent and are labeled unavailable, never zero. Mark GEP years later than the latest WDI observation year as projections, and document that rule as an assumption. Store a CC BY 4.0 attribution for "World Bank, WDI / GEP".

## 7. Groq (personal-processor candidate, Q06)

- URLs: https://console.groq.com/docs/your-data · https://console.groq.com/docs/legal/services-agreement · https://console.groq.com/docs/rate-limits
- What the sources say:
  - Retention: "By default, Groq does not retain customer data for inference requests". Groq may log inputs and outputs for up to 30 days for reliability or abuse checks, with an opt-out in Data Controls. "All customers may enable Zero Data Retention (ZDR) in Data Controls settings", which disables batch and fine-tuning.
  - Region: "All customer data is retained in Google Cloud Platform (GCP) buckets located in the United States". Transfers rely on standard contractual clauses.
  - Training: Services Agreement §4.2 (updated 2026-06-22): "Groq is not permitted to use Inputs or Outputs for training or fine-tuning any AI Model Services or other models" unless the customer permits it. The agreement covers free-of-charge services but caps liability for them at $5,000. It says services "are not for consumer use" and users must be 18+.
  - Free-tier limits: the public page shows a table of 30 RPM, 1K RPD, 8K TPM and 200K TPD for gpt-oss-120b/20b and qwen3.8-27b, but the extracted text labels these "Developer plan" base limits. The free-plan tab could not be read. The page says limits apply per organization and the exact limits are on the account's Limits page.
- Status (research): **blocked — human** → resolved by the owner sign-off of 2026-10-20 (see top). Whether ZDR works on the free tier, the free quota, model choice and acceptance of US data location all need someone with an account and a privacy decision.
- Owner: project owner (Q06).
- Next action: if approved, the human enables ZDR and the logging opt-out, then records the actual free limits and the model ID. Set `CV_ANALYZE_DAILY_CAP` from those limits. Until then `PERSONAL_LLM_ENABLED=false`, and only manual entry and deterministic paths are used.

## 8. Google Gemini API (general / non-personal candidate)

- URLs: https://ai.google.dev/gemini-api/terms · https://ai.google.dev/gemini-api/docs/embeddings · https://ai.google.dev/gemini-api/docs/deprecations · https://ai.google.dev/gemini-api/docs/rate-limits
- What the sources say:
  - Terms (effective 2026-03-23, updated 2026-04-28), Unpaid Services:
    - Google uses submitted content "to provide, improve, and develop" its products.
    - "human reviewers may read, annotate, and process your API input and output".
    - "**Do not submit sensitive, confidential, or personal information to the Unpaid Services.**"
  - Regional clause: "**You may use only Paid Services when making API Clients available to users in the European Economic Area**", and the clause also covers Switzerland and the **United Kingdom**.
  - Embeddings:
    - `gemini-embedding-2` is the latest model (multimodal); it does not support `task_type`, and task prefixes go in the text instead.
    - `gemini-embedding-001` (text only) "remains available" and supports the task types SEMANTIC_SIMILARITY, CLASSIFICATION, CLUSTERING, RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, CODE_RETRIEVAL_QUERY, QUESTION_ANSWERING and FACT_VERIFICATION.
    - The default output is 3072 dimensions. Setting `output_dimensionality: 768` is supported. `gemini-embedding-001` requires manual L2 normalization below 3072; `gemini-embedding-2` normalizes automatically.
    - Input limits are 2,048 tokens for -001 and 8,192 for -2.
  - Deprecations: `text-embedding-004` was shut down on **2026-01-14** and `embedding-001` on 2025-10-30. `gemini-embedding-001` has a listed earliest shutdown of **2028-05-14**.
  - Free-tier rate limits are not published. The docs say "View your active rate limits in AI Studio."
- Status: **verified — restricted** (research). Personal data is prohibited on the free tier. UK clause → resolved by the owner sign-off: unpaid tier only for offline public tasks; paid tier for any live/personal or GB-facing call.
- Owner: project owner (privacy/legal decision) + lead (U05 config).
- Next action:
  1. Gemini free tier receives public reference text only, never CV/JD text, quotes or profile-derived phrases.
  2. The owner decides whether runtime Gemini calls serving GB users fall under the "Paid Services only" clause. Offline seed-time embedding of the public taxonomy is arguably not "making API Clients available to users", but that is a human/legal judgement. The low-risk default is to use Gemini only in offline seed scripts and to serve precomputed vectors at runtime.
  3. Pin `EMBEDDING_MODEL=gemini-embedding-001`, `EMBEDDING_DIM=768` and one task type (e.g. SEMANTIC_SIMILARITY), and L2-normalize, or deliberately choose `gemini-embedding-2`, which has no task_type. Never use `text-embedding-004`.
  4. Record the quota shown in AI Studio.

## 9. Neon Free plan (Q08)

- URLs: https://neon.com/docs/introduction/plans · https://neon.com/docs/introduction/regions · https://neon.com/docs/extensions/pg-extensions
- What the sources say:
  - Free plan:
    - Storage: "1 GB/project, 20 GB account total".
    - Compute: "100 CU-hours/project" per month, autoscaling up to 2 CU (8 GB RAM).
    - Scale-to-zero after 5 minutes, which cannot be disabled.
    - 10 branches per project and 100 projects.
    - 5 GB egress per project per month.
    - 6 h restore window, capped at 1 GB-month.
  - Region: Singapore `aws-ap-southeast-1` is available. Azure regions are deprecated for new projects. "Free projects inactive for 90 or more days are subject to deletion" (as of 2026-10-05).
  - Extensions: `vector` 0.8.0 (PG14–17) and 0.8.6 (PG18); `pg_trgm` 1.6 (PG14–18). The extension page lists no plan restriction for either.
- Status: **verified**. Owner: lead/backend (U03, Q08).
- Next action: a human approves and creates the project in `aws-ap-southeast-1`. Check `db:size` against **1 GB**: 768-dim float4 vectors take about 3 KB per row before indexes, so the O*NET-wide embeddings plus HNSW index must be measured. Use the pooled and direct URLs. Keep the project active to avoid deletion after 90 idle days.

## 10. Vercel Hobby plan (Q08)

- URLs: https://vercel.com/docs/plans/hobby · https://vercel.com/docs/functions/limitations · https://vercel.com/docs/limits/fair-use-guidelines
- What the sources say:
  - Commercial use: "**Hobby teams** are restricted to non-commercial personal use only." Commercial use is any deployment for "financial gain of anyone involved in any part of the production", including a paid employee or consultant writing the code.
  - Functions:
    - Maximum duration **300 s** (default and maximum).
    - Memory **2 GB / 1 vCPU**.
    - Request/response body maximum **4.5 MB**; larger payloads return 413 `FUNCTION_PAYLOAD_TOO_LARGE`.
    - A single region (default `iad1`, changeable); multiple regions are Pro/Enterprise only.
  - Included usage: 4 active CPU-hours, 360 GB-hrs provisioned memory, and 1M invocations per month. Once exhausted, a feature is paused for up to 30 days. Runtime logs are kept for 1 hour.
- Applicability: the 4,000,000-byte upload cap fits under 4.5 MB (4,718,592 bytes if MiB, 4,500,000 if MB), but multipart overhead must stay within the gap. Enforce the cap before parsing and reject larger requests early.
- Status: **verified** for limits. Eligibility → resolved: the owner confirmed on 2026-10-20 the buildfest entry is non-commercial and no one is paid to write it.
- Owner: project owner (Q08).
- Next action: the owner confirms eligibility. Set the function region close to Neon (e.g. `sin1`, after confirming it in the dashboard). Do not deploy until approved.

---

## Implications for implementation

1. **The personal LLM stays disabled.** Keep `PERSONAL_LLM_ENABLED=false` and `LLM_MODE=mock` (tests) until the owner approves Groq. Approval covers enabling ZDR, US data location, free quota and model. Until then only manual entry and deterministic fallback are used (I05).
2. **The Gemini free tier must never receive personal data.** The terms forbid it outright. No fallback from personal tasks to Gemini.
3. **The Gemini UK clause may contradict the architecture.** It reads "Paid Services only" for API clients serving UK users, and GB is a target country. Until a human decides, restrict Gemini to offline seed scripts (public taxonomy embeddings) and serve stored vectors at runtime.
4. **Embedding identity:** `gemini-embedding-001` at 768 dims with manual L2 normalization and a single task type. `text-embedding-004` is shut down.
5. **Do not install `prisma@latest`.** It resolves to the 8.0 RC. Pin 7.10.1 exactly, with `Unsupported("vector(768)")`, migration-SQL extensions, explicit env loading in `prisma.config.ts`, and parameterized raw/TypedSQL in `lib/db/`.
6. **Next 16 uses `proxy.ts`.** Auth and origin checks must also run inside each route handler or server action.
7. **Node 24 LTS** for U01. Re-check after Node 26 becomes LTS on 2026-10-28.
8. **World Bank:** USA sector-growth series are empty and GBR has no GEP series. Both render "unavailable", never zero and never substituted. Persist the WDI vintage (2026-10-08) and GEP vintage (2026-06-11).
9. **Adzuna:** keep the effective caps at the lower of the architecture defaults and the account limits. The "Adzuna" attribution label is required. BD is treated as unsupported. Commercial or trial status needs a human decision before live or public use.
10. **Lightcast:** fixtures and limited coverage only until access is granted. Attribution must link to the Open Terms. The free tier is "not intended for production-scale workloads".
11. **O*NET 31.0** is CC BY 4.0. Show the modified-data attribution in the app.
12. **Neon Free 1 GB storage** is a hard budget for vectors plus indexes. Measure it in U03/`db:size`.
13. **Vercel Hobby** requires a non-commercial confirmation. The 4,000,000-byte upload cap is compatible with the 4.5 MB body limit.
