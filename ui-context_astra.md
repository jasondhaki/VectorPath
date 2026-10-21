# VectorPath — UI context

## 1. Direction

**Dark-only wayfinding workspace.** The product is a career navigation instrument: calm layered night-blue surfaces, warm paper text, a signal-orange action accent and transit-style career paths.

- Flat surfaces and fine borders; no glassmorphism, decorative gradients, hover-lift or gratuitous shadows.
- The signature elements are the transit path map and Fit/Reach/Demand strip. Ranked recommendations use rows, not identical card grids.
- Sentence case, plain labels and readable body text. Do not add all-caps section labels or decorative heading icons.
- No light-mode toggle. Apply the dark root class and define one palette in [`app/globals.css`](app/globals.css).
- All sample figures in design/test states must be labeled synthetic. Real landing teasers read actual computed demo snapshots; never hard-code a persuasive salary or transition duration.

## 2. Tokens

Define the following palette once in the root stylesheet, then expose semantic aliases through Tailwind v4. Validate contrast on rendered components.

| Token purpose | CSS custom-property name | Value |
|---|---|---|
| Deepest graph canvas | night-0 | #0B171D |
| Page background | night-1 | #0F1D24 |
| Panel/sidebar surface | night-2 | #14262F |
| Raised/hover/input surface | night-3 | #1A303B |
| Decorative divider only (1.80:1 on night-0; never a control boundary or state cue) | line-1 | #2A4553 |
| Strong selection border (restricted: 2.58:1 on night-0, below 3:1; never the only selection cue, pair with signal-wash, text or an icon) | line-2 | #3A5D70 |
| Input/control border | line-input | #5B8296 |
| Main text | paper | #F1ECE2 |
| Secondary text | paper-2 | #C3CDD1 |
| Muted text | paper-3 | #93A6AE |
| Primary action | signal | #FF8A3D |
| Primary hover | signal-hover | #FFA164 |
| Text on orange | signal-ink | #10181D |
| Active navigation/selection wash | signal-wash | #353431 |
| Keyboard focus | focus | #FFB27A |
| Have | have | #5ED6A0 |
| Partial | partial | #E8C35A |
| Transferable | transfer | #5BB6F5 |
| To build | build | #FF8FA3 |
| Projected | projected | #B39DFF |
| Error/destructive (not as text on signal-wash: 4.49:1) | danger | #FF6B6B |
| Overlay backdrop | scrim | rgb(5 12 16 / 0.72) |
| Route colors 1–5 | route-1 through route-5 | #FF8A3D, #3CC8B4, #E8C35A, #B39DFF, #5BB6F5 |

Use the normal CSS custom-property double-hyphen prefix when implementing these names. Map shadcn background/foreground to night-1/paper; card to night-2; popover/secondary/accent to night-3; primary to signal and primary foreground to signal-ink; muted foreground to paper-3; border to line-1; input to line-input; ring to focus; charts to route colors. **shadcn accent is neutral, not orange.**

Expose additional semantic classes for canvas, raised, secondary foreground, strong line, selection wash, scrim and five skill states. Components consume those classes, not palette hex strings or default gray/slate colors.

Rules:

- Never use white text on the orange action background; use dark signal ink.
- Have/Partial/Transferable/To build/Projected colors describe requirement states, not general emotional success/failure.
- Every state has a label and icon. Color alone is insufficient.
- Route colors are categorical paths/chart series, not confidence or employability ratings.
- Short colored labels are allowed; reading paragraphs use paper text. Input/focus borders must remain visible against every applicable surface.
- Check WCAG AA contrast on actual foreground/background pairs in U02/U40: 4.5:1 normal text, 3:1 large text and required non-text controls. Record results rather than quoting unverified palette ratios.
- Recorded U02 restrictions (palette-pair computation from `app/globals.css`; full table in [frontend-U02](docs/agents/handoffs/frontend-U02.md) §3): danger text must not sit on signal-wash (4.49:1); line-2 is below 3:1 on every surface, so it is never the sole selection indicator; line-1 is decorative only. Rendered axe colour-contrast passed at 375, 1024 and 1440 px on `/`, the 404 page and the open menu ([QA W01 §2](docs/agents/qa/W01.md)). Rendered contrast of the error and loading routes is still unverified.

## 3. Type, shape and spacing

Fonts: Barlow for body/UI; Barlow Semi Condensed for headings/navigation/stations; Noto Sans Bengali only as a permitted fallback for catalog titles. Prefer licensed locally packaged font files, with system fallbacks, so CI/demo browsing need not contact a public font provider.

| Role | Scale |
|---|---|
| Page title | 30 px equivalent, semibold, slightly tight tracking |
| Section heading | 20 px, semibold |
| Dense controls/tables | 14 px, normal or medium |
| Reading copy | 16 px, relaxed line height, maximum 68 characters per line |
| Metadata | 12 px, medium, muted |
| Scores, durations, money | Tabular numerals; not decorative monospace |

Use 4/8/12/16/24/32 px spacing steps. Controls/badges use about 6 px radius, panels/tables 8 px, dialogs/sheets 12 px and stations/status dots full circles. Overlay shadows only. All interactive hit targets aim for 44 px; compact visible icons can sit within a larger hit area.

Format currency using country locale and actual currency/unit metadata; do not convert missing salary fields. Dates use an unambiguous written month, such as 12 Oct 2026, and duration uses 14 weeks or 6 h. Opportunity is **78/100**, not 78% likelihood of employment.

## 4. Shell and route behavior

Desktop: 240 px sidebar, 56 px topbar, left-aligned content. Sidebar contains Overview, Skills, Opportunities, Paths, Compare a job, Market and Methodology; P2 navigation appears only when enabled. Topbar shows the active profile, country and coverage status, not a mandatory account avatar.

- At ≥1280 px: full sidebar and master/detail layout.
- At 768–1279 px: collapsed navigation and detail sheet.
- Below 768 px: bottom navigation for Overview, Roles, Plan and Paths; secondary actions in menu. Graphs default to List view and tables become semantic stacked rows or labeled scroll regions.
- A profile-scoped page keeps the active profile visible. Public market/methodology pages do not imply authorization to private data.
- Demo banner: Fictional demo profile · Read only. Changing demo country selects an immutable scenario; hours/progress experiments are local previews. Save a copy explicitly creates a guest profile; no invisible mutation of shared demos.
- Empty guest state points to manual entry or upload. No fictitious skill graph is shown as the user's own profile.

### Page requirements

| View | Required content |
|---|---|
| Landing | Clear purpose, Analyze my CV, Enter skills manually, Try a demo profile, four persona cards, one actual snapshot path teaser, provider attribution |
| Intake | 4,000,000-byte limit explained as 4 MB; supported types; consent/processor summary; stage list; no model availability requirement for manual entry |
| Skills | Review table, evidence/inference labels, proficiency 1–4, unresolved mapping, confirmation action, preferences; optional graph tab after U29 |
| Opportunities | Ranked rows, Fit/Reach/Demand, support confidence, learning weeks, actual covered skills and top gaps; filters; held-role section; no forced three-skill fabrication |
| Role detail | Summary → component scores → evidence/explanation → gaps → market/jobs → preparation/education → sources; clear plan/path actions |
| Plan | Full workload summary and estimated learning completion, hours/week, complete-gap count, phases/resources, uncovered gaps, suggested projects, progress and assumptions |
| Paths | Target/green lens, max-hop controls within supported bounds, map/list toggle, legend and 360 px detail inspector on wide screens |
| Compare a job | Paste text only, privacy note, extraction/requirement review, unresolved count, job-specific gap and plan; no URL scraping |
| Market | Country coverage, observed market metrics, sector proxies, forecast vintages and limitations; BD-specific unavailable job data |
| Methodology | Source/license information, formulas and versions, assumptions, actual benchmark results or Not evaluated yet |
| Privacy | Stored-data inventory, processing/retention caveats, owner JSON export and explicit deletion confirmation |

Do not render unfinished P2 routes as working empty pages. Hide navigation and return an intentional unavailable/not-found state until the feature is verified.

## 5. Component contracts

### Shared trust components

- **Source badge**, located at [`components/shared/source-badge.tsx`](components/shared/source-badge.tsx): provider and original fetch date; popover includes source URL/version, observation period, mode, license and query/sample details. Cached and recorded snapshot labels are visible. Dates are not joined into an unreadable metadata string.
- **Required attributions** (architecture §12.5), placed in the footer and the relevant source-badge popover: verbatim O*NET 31.0 CC BY 4.0 modified-data notice; hyperlinked **Adzuna** on job counts and **Adzuna Jobsworth** on salary estimates; Lightcast Open Skills link to its open terms when Lightcast data is shown; **World Bank, WDI / GEP** (CC BY 4.0). Null-series messages are rendered verbatim: *Sector breakdown unavailable in WDI for USA*, *GEP forecast unavailable for GBR*, and the BD Adzuna unavailable message. GEP years after 2025 carry the Projection label.
- **Calculation note**, located at [`components/shared/calculation-note.tsx`](components/shared/calculation-note.tsx): VectorPath estimate, calculation version/time, contributing source facts and assumptions. Used for Opportunity, Reach, hours and derived macro proxies; not falsely branded as an external statistic.
- **Confidence tag**, located at [`components/shared/confidence-tag.tsx`](components/shared/confidence-tag.tsx): High/Medium/Low support plus a textual explanation of the underlying data. Never a calibrated probability badge.
- **State panels**, located in [`components/shared/`](components/shared/): loading, empty, error, unavailable and stale are separate states; each has a reason and an appropriate next action.

### Skills, opportunities and gaps

| Component responsibility | Required behavior |
|---|---|
| Review table | Skill/category, recognized/unresolved state, editable proficiency, evidence source and actions. Keyboard-operable controls; explicit Confirm reviewed skills. |
| Evidence quote | Verified text labeled From your CV; owner-only. No manufactured quote for inference/manual input. |
| Inference note | Suggested from your confirmed role, with occupation source and assumptions. Accept/remove action before use. |
| Skill chip | Name plus state icon/label; evidence available through keyboard-triggered popover. |
| Opportunity row | Rank, role name, three-part strip, score /100, estimated learning duration, real covered/build skills and sourced salary if available. Whole-row interaction has accessible link semantics. |
| Route strip | Three separately labeled comparison bars for Fit, Reach and Demand, and overall score. Values remain legible without color. |
| Why this fits | Grounded factual explanation with references; deterministic template on model failure. No generic flattering personality claim. |
| Gap matrix | Foundations, Knowledge, Tools/software; requirement, importance, current/target level, state, evidence and workload. Critical prerequisites are marked; projections are separate. |
| Gap chart | Optional horizontal comparison bars with an equivalent table. Do not use a radar chart as the only precise comparison. |
| Demand panel | Posting query count, actual salary statistic/unit, observed period, macro context and support; no mixing US occupational facts with local salary claims. |
| Job list | Real approved listing fields and required Adzuna branding/link; current availability caveat. Avoid Apply now / job-ready claims based solely on learned skills. |

### Plans and graph views

Plan timeline: sequential phases, weekly capacity, prerequisite ordering, resource segments, verified-free access notes, optional paid-certificate disclosure and a Suggested project milestone per phase. Completion checkbox means the learner reports finishing, not an independently verified credential. Unvetted search fallbacks cannot look like vetted courses.

Learning summary copy: **Estimated learning completion**, total estimated hours, start date and assumptions. Never Ready for employment by a date. If formal credentials or unmapped requirements remain, show them prominently.

Path map: orthogonal/45-degree route lines, orange You station, hollow bridge stations, filled targets and a leaf symbol for curated green targets. Selecting a station/edge shows role, shared requirements, skills to build, learning effort, source and modeling assumptions. Display summed learning weeks separately from search-cost hop penalties.

Skills graph: confirmed skills, role requirements, bridge relationships and resource nodes; inspector shows the same evidence and data as the table. Clearly distinguish nodes for actual user skills versus target requirements. Limit the rendered subgraph to the current selection, provide expand controls, and avoid rendering the whole taxonomy in the browser.

Both graphs require an equivalent ordered-list/table view, keyboard navigation, text labels, legend, zoom controls and reduced-motion behavior. No salary lift or guaranteed transition labels without approved comparable data.

## 6. P2 presentation

- Outlook title is **Projection**. Show 5–10-year horizon, qualitative confidence, supporting facts and source dates; distinguish observed current requirements from possible future changes. No unsupported automation-risk meter.
- Interest check is optional: twelve activity-liking items, six RIASEC dimensions, Skip action and **Quick check, not a validated assessment**. Interest affinity is separate from Opportunity; never imply personality diagnosis.
- Advisor displays the authorized profile context and cited references. It declines unsupported personal/cultural/market claims. Pending generation is not a reason to stream unverified facts. Chat has explicit busy, unavailable and rate-limit states.
- Remote indicator says **Occupational remote-suitability proxy**, not Remote jobs available. State the source's US-reference limitation and unknown coverage.
- Markdown and print exports retain provenance, assumptions, target and calculation dates; they never include other profiles or owner tokens.

## 7. Required failure-state matrix

| Condition | Message direction | Action |
|---|---|---|
| No profile | Upload a CV or enter skills to see opportunities | Intake/manual/demo |
| No approved personal model | CV analysis is unavailable; manual entry still works | Manual entry, no fake extraction |
| Unreadable/scanned document | Text could not be read from this file | Upload a text-based file or enter skills |
| Over size/character limit | State the actual permitted limit and input problem | Shorten/select text; never silently truncate |
| No confirmed skills | Confirm or add skills before personalized ranking | Skills review |
| Missing BD postings | No job-ad source is configured for Bangladesh | Explain World Bank proxy or no-data state |
| No macro evidence | No market data for this role and country | Neutral-prior explanation, not a fake demand bar with no caveat |
| Stale provider data | Recorded date and Cached snapshot label | Retry only when permitted/budgeted |
| No vetted learning resource | Search results, not vetted; workload estimated | Known-provider search link |
| No valid route | No route found within these constraints | Change target/lens/hours; no forced path |
| No benchmark capture | Not evaluated yet | Show method, not fabricated success numbers |
| Guest session expired | This guest session has expired | New profile/demo; no private-data recovery promise |
| Deletion | Explain exactly which owned records will be removed | Confirm Delete my data; cancel without mutation |

## 8. Accessibility, motion and content

Use Lucide consistently, about 16 px inline and 20 px for controls, with meaningful labels. Icons are not decoration on every heading. Focus ring: two-pixel visible ring with offset; dialogs trap/restore focus. Upload stages announce meaningful transitions through a polite live region, not every streamed token.

One optional orchestrated animation: path lines draw in on initial load, around 600 ms. Other transitions respond to user actions and remain brief. Reduced-motion preference removes draw-in and unnecessary animation. Never animate each score on every rerender.

Tone: direct, practical and encouraging. Say skills to build rather than weaknesses. Explain uncertainty without blaming the user. Keep action names stable: Analyze my CV, Confirm reviewed skills, Build my plan, Compare a job, Export my data and Delete my data.

### UI acceptance checklist

- Responsive at 375, 768/1024 and 1440 px without inaccessible overflow.
- Keyboard-only completion of intake, skills review, plans, graph-list alternative and privacy flow.
- Measured contrast, screen-reader names, visible focus and reduced motion.
- Source/estimate/projection distinctions visible beside relevant content.
- Real empty/no-data/stale/error states, not sample numbers standing in for missing data.
- Demo country/preview interactions remain immutable and external-network independent.
- Projector/screen-share check before submission; fix tokens centrally if surfaces merge.
- Record accessibility results from the rendered application.
