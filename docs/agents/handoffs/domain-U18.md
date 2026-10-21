# Handoff — U18 Redaction and evidence domain (vp-domain)

Date: 2026-10-21. Revision: uncommitted working tree (no commits authorised). Wave W01.

## Summary

Pure contact-detail minimization, text limits and quote verification with normalized-to-original offset mapping (architecture §6.2, I07/I08). All test text is synthetic/fictional; phone numbers are fictional patterns.

- `lib/domain/redaction/redact.ts` — `redactContacts(text) → RedactionResult` (contract type): emails (plain and `[at]/(at) [dot]` variants), URLs (scheme/`www.` and bare profile hosts such as linkedin.com/…), `@handles`, phones (+880/880/00880, BD local mobile 01XXXXXXXXX and landline 02-XXXXXXX, international and US/UK national forms with space/dash/dot/parenthesis separators) and address lines (labelled, BD house/road style, number + street-suffix form). Replacement tokens like `[email removed]`; result carries category counts only. `REDACTION_NOTICE` states minimization, explicitly **not anonymization**.
- `lib/domain/redaction/limits.ts` — `TEXT_LIMITS` (extracted CV 50,000; extraction input 12,000; JD 12,000; advisor 2,000) and `checkTextLimit` → typed reject (`too-long`/`empty`) — never truncates. Counts code points.
- `lib/domain/evidence/quotes.ts` — `normalizeWithMap` (collapse whitespace incl. NBSP/CRLF, unify curly quotes/primes and dashes, drop zero-width/soft hyphen, keep per-char original [start,end)), `locateQuote`, `verifyQuotes` (contract `QuoteVerification`: located by index + droppedCount, no dropped content), `extractedEvidence` (quote stored as the **exact persisted slice**, never the model's string), `occupationInferredEvidence`, `selfReportedEvidence`, `evidenceMatchesText`, `provenanceLabel`.

## Acceptance (copied)

> Minimize contact details, preserve normalized-to-original quote offsets, distinguish extracted/inferred/manual provenance and enforce text limits.
> Done when: BD/international phone and quote-normalization edge cases pass; exact evidence offsets point into persisted minimized text; redaction is never described as complete anonymization.

| Criterion | Covering test |
|---|---|
| BD/international phones | `tests/unit/domain/redaction/redact.test.ts` — 16 phone forms removed; years/ranges/versions/GPA/dates/postcode kept; no cross-line joins |
| Email/URL/handle/address variants without destroying skill terms | same file (Node.js, ASP.NET, Vue.js, C#, F#, "public sector … road", "Block diagrams" preserved); idempotent on minimized text |
| Quote-normalization edge cases | `tests/unit/domain/evidence/quotes.test.ts` — NBSP, newline/CRLF, tabs, curly quotes/apostrophes, em/en dashes, zero-width, padded quotes, empty quotes, first-occurrence rule; returned span slices the original exactly |
| Offsets point into persisted minimized text | quotes.test.ts "offsets point into minimized text, not the original upload" (span valid on minimized, invalid on original; redacted contact cannot be quoted) |
| Locked `evidence.example.json` | quotes.test.ts reproduces span 12–38 |
| Provenance distinct | quotes.test.ts — extracted / occupation-inferred / self-reported labels; self-reported has no quote |
| Dropped items counted, not kept | quotes.test.ts verification counts (no content in result) |
| Text limits | redact.test.ts limits block |
| Never "anonymization" | redact.test.ts honest-wording test |

## Changed paths

- `lib/domain/redaction/redact.ts`, `lib/domain/redaction/limits.ts`, `lib/domain/evidence/quotes.ts`
- `tests/unit/domain/redaction/redact.test.ts`, `tests/unit/domain/evidence/quotes.test.ts`
- `docs/agents/handoffs/domain-U18.md` (this record)

## Contract revision consumed (unchanged)

types/evidence.ts `550f7e1a…`, tests/fixtures/contracts/evidence.example.json `591fa139…` (re-verified by sha256sum).

## Decisions and assumptions

1. Quote matching normalizes only whitespace, quotes and dashes (+ invisible zero-width/soft hyphen) per §6.2; it is **case-sensitive** — a case-changed quote is dropped. Reviewer/lead: say if case folding is wanted (would be a behavior change).
2. Phone acceptance: with `+`/`00` prefix 8–15 digits; otherwise 9–15 digits; runs consisting only of 19xx/20xx groups are years. Known residual: an IP-like dotted run of ≥9 digits would be redacted (over-minimization, safe direction); unusual formats may be missed — redaction is imperfect and never claimed complete.
3. Address detection is line-based and heuristic; the whole line becomes `[address removed]` (indent preserved).
4. Text limits live in `lib/domain/redaction/limits.ts` as the single source for U19b/U33 (code-standards §5 "no competing constants").

## Commands (2026-10-21)

| Command | Exit | Result |
|---|---|---|
| `npx vitest run --project unit tests/unit/domain` | 0 | 4 files, 95 tests passed (U14 + U18) |
| `npx eslint --max-warnings 0 lib/domain tests/unit/domain` | 0 | clean |
| `npm run typecheck` | 0 | clean (frontend error seen during U14 is now fixed) |
| `npm run lint` | 0 | clean (generated Prisma errors seen during U14 no longer reported) |
| `npm run test:unit` | 1 | 263/264 pass. Sole failure: `tests/unit/scripts/boundaries.test.ts` first case **timed out (5000 ms)** — ESLint cold start measured at 10.8–17.2 s for the first `lintText` call regardless of path (existing or nonexistent file), 34–121 ms afterwards. Not a domain-code failure; lead-owned test needs a longer first-case timeout/warm-up. The same suite passed (215/215) at 01:15 before load increased. |
| `npm test` | not run | aggregate blocked until U03 test DB (bootstrap exception) |
| build / E2E | not run | not assigned |

## Limitations / blockers

- `boundaries.test.ts` cold-start timeout above (lead/QA).
- No prompt-control-character sanitizing here (U17 scope).
- Redaction does not remove names, employers or narrative; output remains personal data (by design, stated in `REDACTION_NOTICE`).

## Invariants touched

- I07: only minimized text is meant to persist; result keeps counts, not removed content.
- I08: quotes verified against persisted minimized text; unverifiable dropped and counted; inference and self-report separate.
- I05/I15: none touched (no routing); untrusted text handled as data only.

## Doc/tree updates requested (scribe)

- project-file-tree.md: name `lib/domain/redaction/redact.ts`, `lib/domain/redaction/limits.ts` (§6.2 text limits single source) and `lib/domain/evidence/quotes.ts`.

## External usage

None.

## Review fixes (round 1, review docs/agents/reviews/U18.md) — 2026-10-21

| # | Fix | Regression tests |
|---|---|---|
| 1 (blocking) | Phone detection rewritten as a digit-group scanner. Without a `+`/`00` prefix, a run made only of years and 1–2 digit parts (months, short durations) is a date, not a phone. | redact.test.ts "keeps date range": `2019 – 2021 (2 years)`, `03.2019 – 06.2021`, `2019-03 – 2021-06`, `Jan 2019 - Mar 2021 (2.5 yrs)`, `2019 - 2021 (2` |
| 2 (blocking) | Groups chain only through 1–3 char separators with no double whitespace, and a `+` always starts a new number. Over-long chains are re-scanned at each start (longest valid run ≤15 digits). Leading and trailing years joined by whitespace are trimmed only while the rest is still a phone. The design leans toward redacting. | redact.test.ts: two BD mobiles, landline + mobile, phone + year range (single and multiple spaces), year + phone, two `+880` numbers |
| 3 | Digit groups use `\p{Nd}` with ASCII mapping for detection only (Bengali, Devanagari, fullwidth, etc.), plus fullwidth `＋`. The original text is replaced in place. | Bengali and fullwidth phones, with and without plus |
| 4 | `PERSONAL_HOST` covers subdomains of github.io, gitlab.io, vercel.app, netlify.app, pages.dev, web.app, firebaseapp, herokuapp, wordpress, blogspot, wixsite, carrd, notion.site. `BARE_DOMAIN` (lowercase, case-sensitive) covers `name.dev/.me/.page/.site` and `name.com/…`-style hosts when a path is present. `.io` and `.js` are excluded, so Socket.IO, Node.js, ASP.NET and next.js are kept. | "removes bare personal domains but keeps skill terms" |
| 5 | Street form must start the line and have a comma tail. Two-part rule requires the line to start with house/road/flat/apt/plot/holding. `st`, `block`, `floor`, `ave`, `ln` dropped from the part list. | Blood Donation Drive (with and without city), Day Close, Floor 12 and Block 3 kept |
| 6 | A bare `Address:` label removes up to 3 following lines, stopping at a blank line, a heading or a token line (one count per block). BD labels `Vill/P.O/Post office/Upazila/Thana/Dist/Union` count when there are 2 or more, or when the line starts with one. `holding` and `ward` were added as numbered parts. | label block, rural line, `Holding No. 23, Ward 5`, heading stop |
| 7 | HANDLE has a `(?![\w/])` lookahead, so npm scopes are kept. | `@angular/core`, `@nestjs/common` kept; `@fictional_dev.` removed |
| 8 | Skipped per lead (not in spec). | — |
| 9 | Normalization walks clusters (code point + `\p{M}`) and applies NFC per cluster. Each output unit maps to its whole original cluster. A match must be cluster-aligned, otherwise the next occurrence is tried. Quotes with lone surrogates are rejected. | quotes.test.ts: NFD↔NFC, no span ending before a combining mark, emoji/ZWJ spans, lone surrogates |
| — | Phone scan bounded to 15 groups per start (linear on long number tables). | "scans a 50,000-character number table quickly" |

Case-sensitive matching is unchanged (lead confirmed §6.2). Known residual: any 9–15 digit run with phone-like separators (for example IDs, or "1 2 1 2 …" tables) is redacted. This is over-minimization, which is the intended direction.

Changed paths (this round): `lib/domain/redaction/redact.ts`, `lib/domain/evidence/quotes.ts`, `tests/unit/domain/redaction/redact.test.ts`, `tests/unit/domain/evidence/quotes.test.ts`, this record.

| Command | Exit | Result |
|---|---|---|
| `npx vitest run --project unit tests/unit/domain` | 0 | 123 passed |
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm run test:unit` | 0 | 303 passed (lead's cold-start fix is in) |

### Round 2 fixes (review "Round 2", 2026-10-21)

| # | Fix | Regression test (redact.test.ts "U18 round 2 review fixes") |
|---|---|---|
| R2-1 | Up to 3 whitespace characters are allowed between digit groups; the double-space split is gone. Over-long chains are still re-scanned and a whitespace-joined trailing year is still trimmed, so `01712  345678`, `017 1234  5678` and two mobiles 2 spaces apart are all redacted. | 4 cases |
| R2-2 | An international (+/00) number never has a trailing year-like group trimmed. | `+44 20 7946 2001` |
| R2-3 | Bare `.dev/.me/.page/.site` domains are now matched case-insensitively. `name.com/path` stays lowercase-only so tech names (Node.js, Socket.IO, ASP.NET) are kept. | `JaneDoe.dev`, `Janedoe.ME/work` |
| R2-4 | BD labels now need `:`, or a `-` that is not followed by level/wide/based. | District-level, Union-level, Thana-based, Union-wide kept; `Thana: …, Dist: …` removed |

R2-5 (NFC as a §6.2 clarification) goes to scribe. R2-6 is resolved by the lead's integration run.

**Limitation for U19b/U26:** any run of 9–15 digits joined by phone-style separators is redacted as a phone. This includes some IDs and number lists, for example "ISO 9001 14001". Evidence that contains such a run is replaced in the persisted text and can no longer be quoted. That errs toward removing too much, not leaking; the review-screen UI should say so.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm run test:unit` | 0 | **334 passed** (15 files) |

## QA defect fixes (BUG-W01-001, BUG-W01-002) — 2026-10-21

| Bug | Fix (lib/domain/redaction/redact.ts) | Regression tests (redact.test.ts "QA defect fixes…", "address block stops at contact lines") |
|---|---|---|
| BUG-W01-001 (Medium) | **`STREET_START`:** a street segment at the start of a line. It allows an optional "Flat/Apt/Suite N," unit prefix, capitalized or all-caps words (MG), Street/Road/Avenue/Lane/Drive/Court/Place/Crescent/Terrace/Square/Marg and similar, and an optional NW/NE/SW/SE/N/S/E/W. With a comma tail it is an address; alone on its line it is an address only next to another address or postcode line (header blocks). **`UNIT_START`:** "Flat 3B, Rose Court". **Strong postcode lines:** UK postcode (case-sensitive), or US city + state code + ZIP(+4). **IN PIN:** 6 digits after a city at line end, strong with a comma, otherwise weak (adjacency only). Addresses now run **before** phones, so a ZIP+4 belongs to its address line. An `Address:` continuation block now stops at Tel/Phone/Mobile/E-mail lines. | All 6 QA repro inputs plus the GB and IN two-line headers are removed. Kept: Floor 12 and Block 3, Blood Donation Drive (with and without city), 5 Day Close (inline and as a lone line), District-level, "Drive sales growth by 20%", "Team lead for 12 engineers since 2019", "3 Main Street projects delivered", "Sold 150000", "Revenue grew to 250000", Dhaka-1209 |
| BUG-W01-002 (Low) | `PHONE_LABEL`: Tel/Telephone/Phone/Ph/Mob/Mobile/Cell/WhatsApp/Fax/ফোন/মোবাইল, optionally followed by No./number/# and `:`/`.`/`-`, directly before a number chain lowers the minimum to 7 digits. Unlabelled runs keep the 9-digit minimum, and the date rule still applies. | `Tel: 555-0123`, `Phone: 9123-456`, `Phone: 9123456`, `Mob. 555 0199`, `WhatsApp #: 5550123`, Bengali `ফোন: ৫৫৫০১২৩` are removed. `Ref 555-0123`, `Phone: 2019-2021`, `Cell biology 2019 - 2021`, `Batch 12345` are kept |

**Residual limits:**
- A lone street-like line is kept unless an adjacent line is an address or postcode line.
- A UK-postcode-shaped token anywhere on a line removes the whole line.
- US addresses without a state code and ZIP are caught only when they start with a street segment.
- Redaction stays imperfect and is minimization only.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm run test:unit` | 0 | **375 passed** (15 files) |

### Round 3 over-redaction fixes (review "Round 3") — 2026-10-21

| # | Fix (redact.ts) | Regression tests (redact.test.ts "U18 round 3 over-redaction fixes") |
|---|---|---|
| R3-1 | Weak lines now have a kind: `street` (a bare street line) or `pin` (a weak PIN line). A weak line is confirmed only by an adjacent strong address line, or an adjacent weak line of the **other** kind. | "Units Sold 150000" + "Revenue Target 250000" kept. "3 Regional Sales Drive" + "5 Day Close" kept. A street + PIN header is still removed |
| R3-2 | A UK postcode must follow a place-name token and sit at line end or before a comma. Its inward part must not be a size unit (KB/MB/GB/TB). | "EC2 4GB", "Apple M1 8GB", "PS4 1TB" and an inline mid-sentence postcode kept. "London NW1 6XE", "…, London NW1 6XE, UK" and "Manchester M1 1AE" removed |
| R3-3 | An IN PIN is strong only as "City, PIN" at line end, with the comma directly between the city and the PIN. "City PIN" without that comma is weak. | "Covered 20 schools, Students 120000" kept. "Bengaluru, 560001" removed |

**R3-3 revision (lead: no leak trade-off allowed):** an IN PIN line is also **strong** when there is a comma among the place-name tokens before the PIN, and the line has no other number except a leading house/plot number or ordinals such as "5th Block". This errs toward redaction. Removed again: "Indiranagar, Bengaluru 560038" (the original single-line test is restored), "Koramangala 5th Block, Bengaluru 560095", "HSR Layout, Bengaluru, Karnataka 560102" and "12, Indiranagar, Bengaluru 560038". Kept: "Covered 20 schools, Students 120000", because it contains another number. Every earlier redaction case is green.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm run test:unit` | 0 | **392 passed** (15 files), after the R3-3 revision |

### BUG-W01-001 reopen fixes — 2026-10-21

| Leak | Fix (redact.ts) | Regression tests (redact.test.ts "BUG-W01-001 reopen") |
|---|---|---|
| "B-12, Sector 62, Noida, Uttar Pradesh 201301", "Plot 7, Banjara Hills, Hyderabad 500034" | On a "<places>, <PIN>" line, these digit runs are now allowed besides ordinals: a leading alphanumeric house ID (12, 12A, B-12, 7/3) and numbers directly after Sector/Plot/Block/Phase/House/Flat/Road No./Lane/Ward/Holding (`UNIT_NUMBER`). Any other number still makes the line weak. | Both repros removed, plus "7/3, Phase 2, Road No. 5, Banjara Hills, Hyderabad 500034" and "12A, Ward 4, Lane 3, Kochi 682001" |
| A lone "Flat 3B" line in a header | `LONE_UNIT` (Flat/Apt/Suite/Plot/House + ID, alone on its line) is weak. It is removed only when an adjacent line is already removed as an address, including a street line confirmed by a postcode. | GB header with a "Flat 3B" line fully removed. "House 5" with no address neighbour kept |

Must-keep lines stay green: "Team of 8, Bengaluru 2019", "Covered 20 schools, Students 120000", "Managed 3 Main Street retail branches in London" and "Led 4 teams, Sector 5 rollout, Revenue 250000", as well as every earlier keep and redaction case.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm run test:unit` | 0 | **402 passed** (15 files) |

### BUG-W01-001 round 2 — gazetteer anchor (2026-10-21)

- **New `lib/domain/redaction/gazetteer.ts`:** a static, deterministic list of public Indian place names, used only to anchor address detection. It holds `IN_STATES_AND_UTS` (all 28 states and 8 UTs, plus alternate spellings such as Orissa, Pondicherry, New Delhi, NCT of Delhi) and `IN_CITIES` (about 280 major cities and district HQs, including Noida, Gurugram/Gurgaon, Hyderabad, Chennai, Bengaluru/Bangalore, Kolkata, Mumbai, Pune, Delhi and Kochi). These are public names, not personal data, and need no licence.
- **`IN_GAZETTEER_PIN` (strong):** a line ending in a gazetteer name, then an optional "," or "-", then a 6-digit PIN starting 1–8, then an optional ", India", is an address whatever other numbers it holds. A lone "Noida 201301" line is therefore strong and confirms its weak neighbour. The older comma+PIN rule (`isCommaPlaceLine`) stays as a fallback for places not in the list.
- **Unit tokens:** `UNIT_NUMBER` now also covers H.No., Door No and Plot No., plus Apt/Apartment/Suite. IDs may look like 4-1-12, 12/3, B-12, or a single letter (Block C).
- **Unit lines:** a unit-only line ("B-12, Sector 62", "Block C, Flat 302", "Flat 3B", "H.No. 4-1-12"), or a line that starts with a unit token followed by a comma ("Door No 12/3, Anna Nagar"), is weak. It is removed only when an adjacent line is already removed as an address.
- **Permanent tests:** QA's probe-reverify.keep.ts and probe-r2.ts are now in redact.test.ts, block "QA probes (BUG-W01-001 round 2, gazetteer anchor)", using QA's own pass criteria.
  - Must-remove: 26 cases, the 19 from probe-reverify plus 6 from probe-r2 (2 overlap), plus my ", India" variant.
  - Headers: 8, the 7 from both probes plus 2 of my own and 1 overlap.
  - Must-keep: 36, the 25 + 9 from QA plus 2 of my own.
  - Also one adjacency keep-test.
- **Tree update requested (scribe):** add `lib/domain/redaction/gazetteer.ts` to project-file-tree.md.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | clean |
| `npm run test:unit` | 0 | **473 passed** (15 files) |
