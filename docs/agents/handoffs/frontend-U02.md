# Handoff — frontend U02: Dark tokens, fonts and shell

Role: vp-frontend · Date: 2026-10-21 · Revision: working tree (no commits) · Contract: lock v1 (no shared TS contract consumed or changed; tokens from ui-context_astra.md §2).

## 1. Summary and acceptance

Acceptance (tracker U02): implement the sole UI palette, semantic mappings, local/system font fallback, sidebar/topbar/mobile navigation and shared loading/empty/error/unavailable states. Done when: shell works at 375, 1024 and 1440 px, keyboard focus is visible, actual contrast checks are recorded and token lint catches invalid component colors.

Delivered:
- `app/globals.css`: the palette unchanged, plus full shadcn mappings (accent neutral night-3) and the extra semantic classes: `canvas`, `raised`, `foreground-secondary`, `line-strong`, `selection`, `scrim`, `have`/`partial`/`transfer`/`build`/`projected`, `route-1..5`, `chart-1..5`, `primary-hover`, `destructive`, `input`. It also sets the font stacks, a global 2 px `:focus-visible` outline with 2 px offset in `--focus`, a reduced-motion override and a scrim backdrop for the native popover.
- Fonts: `@fontsource/barlow` 400/500/600 and `@fontsource/barlow-semi-condensed` 500/600 are imported in `app/layout.tsx`, so they are bundled locally with no remote fetch. The fallback stack is Barlow → Noto Sans Bengali (local only) → system-ui. Headings and nav use `font-heading`.
- Shell (`components/layout/app-shell.tsx`, server component, no client JS):
  - Below 768 px (`md`): fixed bottom bar with Overview, Roles, Plan and Paths (Paths hidden while `FEATURES.paths` is false). Secondary items go in a native `popover` sheet opened by a Menu button. It has light dismiss, Esc and a Close button.
  - 768–1279 px: 64 px icon rail. Labels are `sr-only`, and each item has a `title` attribute.
  - 1280 px and up (`xl`): full 240 px sidebar with labels.
  - 56 px sticky topbar. With a profile it shows profile, country and coverage (coverage appears from `lg`). Without one it shows "No active profile". There is no account avatar.
  - Skip link goes to `<main id="main" tabindex="-1">`. The brand links to `/` and is not a heading, so the landing `h1` stays unique (e2e scaffold test).
- Nav honesty (`components/layout/nav-items.ts`): every destination is `built: false`, so `resolveHref` returns null. Items render as `<span aria-disabled="true">` with sr-only "(not available yet)", a `title` attribute and a visible "Dimmed items are not available yet." note. Items behind a feature flag (Paths, Compare a job, Market) are hidden while their flag is off. No placeholder pages were created.
- Shared states (`components/shared/`): `StatePanel` frame (icon + title + reason + optional action), `LoadingState` (`role=status`), `EmptyState`, `ErrorState` (`role=alert`), `UnavailableState`, and `StaleState` ("Cached snapshot · Recorded <date>"). Every state has text and an icon, not color alone.
- Route boundaries: `app/loading.tsx`, `app/error.tsx` (never renders `error.message`; offers Try again and Go to start) and `app/not-found.tsx`.
- `app/dev/components/page.tsx`: development-only gallery of all five states, labeled synthetic. It calls `notFound()` in production. This route is already listed in project-file-tree.md.
- `app/page.tsx`: its `<main>` became a `<div>` because the shell now owns the main landmark. The h1 text is unchanged.

## 2. Changed paths

- Modified: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Added: `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/dev/components/page.tsx`
- Added: `components/layout/app-shell.tsx`, `components/layout/nav-items.ts`
- Added: `components/shared/state-panel.tsx`, `components/shared/empty-state.tsx`, `components/shared/error-state.tsx`, `components/shared/no-data-state.tsx`
- Added: `tests/unit/components/contrast.test.ts`, `tests/unit/components/token-lint.test.ts`, `tests/unit/components/shell.test.ts`
- Added: `docs/agents/handoffs/frontend-U02.md`

No deletions or renames. Nothing generated. No package installed.

## 3. Verification (2026-10-21, local; UTC 2026-10-20T19:16Z)

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 1 | **Not caused by U02.** All 575 errors and 412 warnings are in `lib/db/generated/**`, the Prisma client from backend's in-progress U03, which ESLint does not ignore. `npx eslint --max-warnings 0 . --ignore-pattern "lib/db/generated/**"` gives exit 0. `npx eslint --max-warnings 0 app components tests/unit/components` gives exit 0. `node scripts/check-tokens.mjs` gives exit 0 ("13 files clean"). |
| `npm run test:unit` | 0 | 11 files, 215 tests passed (91 new in `tests/unit/components`). One earlier run hit a 5 s timeout in `tests/unit/scripts/boundaries.test.ts` (cold ESLint load, QA-owned); it passed on rerun. |
| `npm run check:docs` | 0 | 27 docs; 4 routes listed; 232 paths single-owned |
| `npm run agents:audit` | 0 | ownership audit passed |
| `npm run build`, `npm run dev`, `npm run test:e2e` | not run | not assigned; shared `.next` output |
| `npm test` (aggregate) | not run | BLOCKED until U03 test DB (bootstrap exception) |

### Contrast (WCAG 2.x, computed from `app/globals.css` hex values)

`contrast.test.ts` asserts these thresholds. It also checks that every single-value hex in `globals.css` matches the ui-context table (21 rows). Ratios:

| fg \ bg | night-0 | night-1 | night-2 | night-3 | signal-wash |
|---|---|---|---|---|---|
| paper | 15.45 | 14.60 | 13.23 | 11.66 | 10.57 |
| paper-2 | 11.24 | 10.62 | 9.62 | 8.48 | 7.69 |
| paper-3 | 7.19 | 6.80 | 6.16 | 5.43 | 4.92 |
| signal | 7.76 | 7.33 | 6.64 | 5.85 | 5.31 |
| signal-hover | 9.12 | 8.62 | 7.81 | 6.89 | 6.24 |
| focus | 10.31 | 9.74 | 8.83 | 7.78 | 7.05 |
| have | 10.05 | 9.50 | 8.61 | 7.58 | 6.88 |
| partial | 10.73 | 10.14 | 9.19 | 8.10 | 7.34 |
| transfer | 8.19 | 7.74 | 7.01 | 6.18 | 5.60 |
| build | 8.41 | 7.95 | 7.20 | 6.35 | 5.76 |
| projected | 7.95 | 7.52 | 6.81 | 6.00 | 5.44 |
| danger | 6.55 | 6.19 | 5.61 | 4.95 | **4.49** |
| line-input | 4.40 | 4.16 | 3.77 | 3.32 | 3.01 |
| route-2 | 8.76 | 8.28 | 7.50 | 6.61 | 5.99 |
| line-2 | **2.58** | **2.44** | **2.21** | **1.95** | **1.77** |
| line-1 | 1.80 | 1.70 | 1.54 | 1.36 | 1.23 |

- signal-ink on signal: 7.65. signal-ink on signal-hover: 9.00.
- Recorded restrictions (asserted as failing so a token change forces a review):
  - danger text must not sit on signal-wash (4.49 < 4.5).
  - line-2 is below 3:1, so the strong selection border can never be the sole selection indicator; pair it with the wash, text or an icon.
  - line-1 is decorative only.
- These are palette-pair computations. Rendered-component contrast still needs QA in a browser (ui-context §8).

### Token lint evidence

`token-lint.test.ts` passes a synthetic `components/shared/bad.tsx` source to the QA-owned `findViolations`. It asserts that each of these is rejected: raw hex, a default palette class (`text-slate-400`), an arbitrary colour (`bg-[#…]`), a hex in a style prop, `border-white` and `rgb()`. It also asserts that the new semantic classes pass. Whole-tree enforcement stays in `npm run lint`.

### Breakpoint and keyboard evidence without a browser

- Breakpoints are Tailwind defaults: `md` 768, `lg` 1024, `xl` 1280. Classes: bottom bar `md:hidden`; rail `hidden md:flex` with grid `4rem` → `xl:15rem`; labels `sr-only xl:not-sr-only`. The content column uses `minmax(0,1fr)` and `min-w-0` to prevent horizontal overflow. Main content has `pb-24` below `md` so the fixed bottom bar does not cover it.
- Expected layout by width:
  - 375 px: bottom bar plus Menu sheet.
  - 1024 px: icon rail. Coverage shows in the topbar from `lg`.
  - 1440 px: full sidebar.
- `shell.test.ts` (static render) asserts:
  - a skip link to a focusable `<main>`
  - no `href` to unbuilt routes
  - `aria-disabled` and an accessible "(not available yet)" reason
  - "No active profile" when there is no profile
  - profile, country and coverage rendering when a profile is supplied
  - popover wiring
  - nav order and bottom-bar membership
  - `resolveHref` param substitution and encoding, plus null when context is missing
  - feature-flag hiding
- Interactive controls (skip link, brand, Menu, Close) have a minimum 44 px hit area (`min-h-11`/`min-w-11`). Disabled nav spans are not focusable by design, because they are not destinations.

## 4. QA must verify in a browser (375 / 1024 / 1440)

1. No horizontal scroll at each width. The bottom bar does not cover the last content at 375 px.
2. Tab order: skip link appears visibly on first Tab and moves focus to main → brand → (375) Menu. The 2 px focus ring is visible on every surface: night-1 page, night-2 sidebar and bar, night-3 popover.
3. Menu sheet (375): opens from Menu, closes on Esc, backdrop click and Close, and focus returns to Menu. Scrim backdrop renders.
4. Rail at 1024 px: icons only, `title` tooltips on hover, and the screen reader announces label plus "(not available yet)".
5. Fonts: in DevTools Network, Barlow and Barlow Semi Condensed woff2 load from the app origin, with no request to Google Fonts or any third party (also covered by the e2e network block).
6. `/dev/components` (dev server only): all five states render. Spinner stops with `prefers-reduced-motion: reduce`. Loading is announced as a status and Error as an alert.
7. Rendered contrast spot-check with axe or Lighthouse on `/` and `/dev/components`.
8. Existing e2e `tests/e2e/scaffold.spec.ts` still passes: there is a single h1 "VectorPath".

## 5. Limitations and next steps

- Active-route highlighting (`aria-current` plus the selection wash) is not implemented, because no nav destination exists yet. Add it with `usePathname` in a small client leaf when the first page ships.
- The topbar `profile` prop is never supplied yet. `app/p/[profileId]/layout.tsx` (U04/U21) will pass it from an authorized DTO. Coverage text must come from real data.
- Token-lint gaps (REQUEST to QA, not edited): `scripts/check-tokens.mjs` does not catch named CSS colors in style props (e.g. `color: "red"`), `fill-white`/`stroke-black`, `outline-white`, or `hsl`/`oklch` in arbitrary brackets other than the leading `[hsl`. I suggest adding these rules.
- Fonts are imported from `node_modules` CSS. Bundling is unverified until the lead or QA runs `npm run build`.
- Lint gate (REQUEST to lead/backend): add `lib/db/generated/**` to the ESLint ignores, or have backend relocate or ignore it. Until then `npm run lint` fails for every unit.

## 6. Invariants touched

- Dark accessible UI only, one token set (CLAUDE.md §3.11). Covered by contrast.test.ts, token-lint.test.ts and check-tokens.
- No fabricated figures or working-looking unbuilt routes (§3.11). Covered by shell.test.ts: unbuilt items are non-links and "No active profile" is shown. The gallery is labeled synthetic and is not found in production.
- No remote font fetch (code-standards §9). Fonts are local `@fontsource`; browser verification is pending (QA item 5).
- `app/error.tsx` does not render error messages (privacy: no server or provider detail leaks).

## 7. Documentation and tree updates requested (scribe/lead)

- project-file-tree.md, components section: add `components/shared/state-panel.tsx` (shared state frame and LoadingState). Note that `no-data-state.tsx` exports `UnavailableState` and `StaleState`. Add `components/layout/nav-items.ts` under the layout entry if per-file listing is wanted.
- ui-context §2 or a U02 record: record the contrast table above and the three usage restrictions.
- No shadcn primitive or package needed for U02.

## 8. External usage

None. No provider, model or network calls. No installs and no git writes.

## 9. Review fixes (docs/agents/reviews/U02.md, 2026-10-21)

| # | Fix |
|---|---|
| 1 | `app/error.tsx`: the copy is now neutral: "This page could not be shown. Try again or return to the start." The unverifiable data claim is removed. |
| 2 | The mobile menu is now a modal `<dialog>` in a new client leaf, `components/layout/mobile-menu.tsx` (the only client JS in the shell). `showModal()` makes the page inert, which traps focus. Esc closes it natively, and the browser restores focus to the Menu button. A backdrop click or following a link also closes it. The dialog is named with `aria-labelledby="vp-nav-menu-title"` (the "More" h2), and the links sit inside `<nav aria-label="More">`. The Menu button has `aria-haspopup="dialog"`. The scrim is now Tailwind's `backdrop:bg-scrim`, and the `[popover]::backdrop` rule is removed. |
| 3 | `@theme inline` now starts with `--color-*: initial;`. I checked this with Tailwind's own compiler (`@tailwindcss/node` `compile` on `app/globals.css`, scratch script, nothing written to the repo): `bg-red-500`, `text-white` and `bg-black` no longer generate any CSS, while `bg-scrim`, `backdrop:bg-scrim`, `text-foreground-secondary`, `bg-selection`, `text-have` and `border-line-strong` still do. No component relied on the default palette; lint, check-tokens and the tests are green. |
| 4 | `StatePanel` takes `headingLevel` (1, 2 or 3, default 2). `LoadingState`, `EmptyState`, `ErrorState` and `UnavailableState` pass it through. `app/loading.tsx`, `app/error.tsx` and `app/not-found.tsx` render h1. |
| 5 | `app/globals.css` has a comment beside each restricted token: `signal-wash` (no danger text, 4.49:1), `line-2` (below 3:1, never the sole selection cue) and `line-1` (decorative only). |
| 6 | Unavailable nav items now announce once: the label plus the sr-only "(not available yet)". `aria-disabled` and `title` are removed. |
| 7 | At 768–1279 px each rail item shows a visual-only hover tooltip (`aria-hidden`): "Label: not available yet", or just the label once the page is built. The tooltip is hidden at `xl` and up, where labels are visible. `overflow-y-auto` is removed from the sidebar nav so the tooltip isn't clipped; seven items fit at any viewport height. |
| 8, 9 | Skipped as instructed. 9 lands with U04/U21. |

Tests updated in `tests/unit/components/shell.test.ts`:
- **Dialog:** it has its name, the `nav aria-label="More"` landmark and `aria-haspopup`, and no popover attributes remain.
- **Single announcement:** there is no `aria-disabled` and no duplicate title, and the rail tooltip is present.
- **Heading levels:** state panels default to h2; `LoadingState headingLevel=1` and `app/not-found` render h1.

Additional changed paths:
- Added: `components/layout/mobile-menu.tsx`
- Modified: `app/globals.css`, `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`, `components/layout/app-shell.tsx`, `components/shared/state-panel.tsx`, `components/shared/empty-state.tsx`, `components/shared/error-state.tsx`, `components/shared/no-data-state.tsx`, `tests/unit/components/shell.test.ts`

Gates (2026-10-21; UTC 2026-10-20T19:31Z):

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | — |
| `npm run lint` | 0 | Now green repo-wide, since `lib/db/generated` is no longer linted. check-tokens: 14 files clean. |
| `npm run test:unit` | 0 | 14 files, 275 tests; 92 of them in `tests/unit/components` |
| `npm run check:docs` | 0 | — |
| `npm run agents:audit` | 0 | — |
| build, dev, E2E | not run | lead runs them at integration |

QA additions for the browser pass:
- **Menu at 375 px:** focus stays inside the dialog, Esc closes it, focus returns to Menu, and a backdrop click closes it.
- **Rail tooltip at 1024 px:** it appears on hover and is not clipped.
- **Route headings:** the error, loading and not-found pages each have exactly one h1 (the shell has none).

Additional tree request: add `components/layout/mobile-menu.tsx` under the layout entry.
