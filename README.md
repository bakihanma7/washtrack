# WashTrack Pro

A single-page admin dashboard for managing a car wash and automotive maintenance
business — Executive Dashboard, Car Wash Jobs, Maintenance Jobs, and Customer
Management.

## Status: v2.5 — Platform & Access

Building on v2.4, this update implements the "Platform & Access" section of
`ROADMAP.txt` (items #29–#35):

- **Auth (login/sign-up) + roles.** `js/auth.js` adds client-side sign-up and
  login screens — accounts (name, email, SHA-256 hashed password, role) live
  in `localStorage`; a session is just an account id in `localStorage`. This
  is demo-grade auth for role-based UI gating, not a production security
  system — there's no backend to keep secrets on. The whole app is gated
  behind `#authScreen`/`#appShell`, driven by an `html[data-auth]` attribute
  set as early as possible (mirroring the existing dark-mode
  flash-prevention pattern) so there's no flash of the dashboard before a
  session is confirmed.
- **Role-based access.** Admin / Manager / Technician roles. `ROLE_PAGES` in
  `js/auth.js` gates which sidebar items and pages each role can reach;
  Technicians land on a stripped "My Jobs Today" view instead of the full
  dashboard, and can't reach Customers/Inventory/Packages/Reports.
- **Threaded notes.** Customers and jobs each have a notes panel
  (`js/platform.js`), authored by whoever's logged in, stored per-record in
  `DATA.notes`.
- **QR/barcode check-in.** A camera-based "Scan to Check In" flow using a
  locally vendored copy of `jsQR` (`js/vendor/jsqr.js` — not loaded from a
  CDN, since WebKit rejected cdnjs's copy in CI). Each customer's profile
  can generate a check-in QR (via the qrserver.com image API) to scan
  against.
- **Google Calendar sync — stub.** A connect/disconnect toggle in the new
  Settings modal that simulates the connected state in `localStorage`.
  Genuine two-way sync needs a backend to hold OAuth tokens, which this
  static, GitHub Pages-hosted app doesn't have — the modal says so
  explicitly rather than pretending to sync.
- **Offline PWA.** `manifest.json` + `sw.js` cache the app shell for offline
  use; a small pending-changes queue tracks saves made while offline and
  flushes (with a toast) once the `online` event fires. The Settings modal
  shows live online/offline status and a manual "Sync Now."
- **"My Jobs Today."** A mobile-friendly technician companion view
  (`#page-myjobs`) filtering Car Wash + Maintenance jobs by the logged-in
  technician's exact name.

The Playwright suite now seeds an authenticated admin session in every spec
via `tests/helpers/seed-session.js` (`seedAuthenticatedSession` /
`clearAndSeedSession`), since every page requires a session.

## Status: v2.4 — Polish & Accessibility

Building on v2.3, this update implements the "Polish & Accessibility"
section of `ROADMAP.txt`:

- **Real client-side routing.** `navigate()` now uses `history.pushState`
  for genuine navigations (sidebar clicks, "New Job" redirects, keyword
  search routing), so the browser's Back/Forward buttons move between
  actual pages. In-page state changes (search, filters, sort, pagination)
  still use `history.replaceState`, so typing in the search box or
  flipping a page doesn't spam the history stack. A `popstate` listener
  re-syncs in-memory state and the DOM (without pushing another entry)
  whenever the user navigates via Back/Forward.
- **Page transition animation.** `.page.active` now runs a 220ms fade +
  slight slide-up (`@keyframes page-in`) instead of an instant
  `display:none` → `display:block` cut, and is skipped entirely under
  `prefers-reduced-motion: reduce`.
- **`outline` contrast bump.** The caption-text color moved from `#6b7a76`
  (4.28:1 against the app's surface background — under the 4.5:1 AA
  minimum for normal text) to `#5c6b67` (5.3–5.6:1 against the surfaces it
  actually appears on), with real comfortable headroom instead of sitting
  right at the line.
- **Dark mode.** Every design token in `tailwind.config.js` is now a CSS
  custom property (`rgb(var(--color-x) / <alpha-value>)`), with light
  values in `:root` and dark values under `html.dark` — see DESIGN.md's
  new "Dark Mode" section for the full palette-inversion approach. A
  sun/moon toggle button in the header flips the `dark` class, persists
  the choice to `localStorage`, and an inline `<head>` script applies the
  stored preference (or `prefers-color-scheme`) before any CSS loads, so
  there's no flash of the wrong theme.
- **Favicon, meta description, Open Graph/Twitter card tags.** `favicon.svg`
  plus real `<meta name="description">`, `og:*`, and `twitter:*` tags, so
  the browser tab and any shared link have real content instead of the
  browser/platform default.

## Status: v2.3 — Performance & Architecture

Building on v2.2, this update implements the "Performance & Architecture"
section of `ROADMAP.txt`:

- **Debounced search.** The global search input updates its own value
  instantly (so typing never feels laggy), but the expensive re-filter /
  re-render / URL-write only fires 250ms after the last keystroke
  (`debounce()` in `js/script.js`), instead of running on every keystroke.
- **Row markup moved into JS template functions.** Table rows for
  Customers, Car Wash Jobs, and Maintenance Jobs were already generated
  from `DATA` via template-literal functions (not hand-copied per-row
  markup) as of v2.1; this update carries that pattern through the new
  Performance work rather than reintroducing duplication.
- **Inline `onclick="..."` replaced with delegated `addEventListener`.**
  Every interactive element in `index.html` and the modal templates in
  `js/modals.js` now uses `data-action="fnName"` (plus an optional
  `data-arg="value"`) instead of an inline handler. A single delegated
  `document.addEventListener('click', ...)` in `js/script.js` looks up
  the action in an `ACTIONS` map and calls it — this keeps behavior out
  of markup, works with a CSP that disallows inline handlers, and
  requires no re-binding when modal content is injected via `innerHTML`.
- **Real build pipeline.** `css/styles.css` is no longer hand-compiled;
  `npm run build:css` runs the Tailwind CLI (`css/input.css` +
  `tailwind.config.js` → `css/styles.css --minify`), replacing the
  `<script src="cdn.tailwindcss.com">` runtime script entirely. See
  "Build & run" below.
- **Playwright test suite + CI.** A real suite now lives in `tests/`
  (navigation, data rendering, search/filter/pagination, form mutations
  + `localStorage` persistence, keyboard accessibility/focus-trapping,
  and responsive/visual smoke checks), run via `playwright.config.js`
  against Chromium and mobile Safari (WebKit) projects. A GitHub Actions
  workflow (`.github/workflows/tests.yml`) runs the suite on every push
  and pull request and uploads the HTML report as a build artifact.

## Status: v2.2 — Interaction & Forms

Building on v2.1, this update implements the "Interaction & Forms" section of
`ROADMAP.txt`:

- **Real forms, not toast placeholders.** "New Job" (sidebar), "New Wash
  Job"/"New Service" (dashboard quick actions and the Car Wash page), "Add
  Expense," and "Register New Customer"/"Add Customer" now open real modal
  forms with validated fields (required fields, email format, positive
  numbers) instead of just showing a toast. Submitting a valid form creates
  a real record in the data layer (`js/data.js`), saves it to `localStorage`,
  and navigates you to see it.
  - The "New Job" modal has a Car Wash / Maintenance toggle that swaps the
    field set for the two job types, so it's one form covering both rather
    than two near-duplicate ones.
  - "Add Expense" is wired to the Dashboard's Expenses and Net Profit stat
    cards, which now update live and persist — a visible way to see the
    form is doing real work, not just closing a dialog.
- **Custom dropdown component.** The native `<select>` used for the
  Customers "Filter by" sort control has been replaced with a
  dependency-free, keyboard-accessible listbox (`js/dropdown.js`) matching
  the Luminous Care design tokens. It's also reused for every dropdown-style
  field inside the new forms (Service Type, Status, Category, etc.) so the
  whole app has one consistent picker instead of mixing native and custom
  controls.
- **Confirmation modals for destructive actions.** "Deactivate Account" and
  "Cancel Job" now open a confirmation dialog explaining the consequence
  before anything happens, instead of acting immediately (or, previously,
  just describing what *would* happen). Cancelling the confirmation leaves
  the record untouched; confirming performs the action and persists it.
- **Focus trap on side panels.** Tab/Shift+Tab now cycle within the open
  Customer Detail and Job Detail side panels instead of escaping into the
  page behind them — the same trap utility (`attachFocusTrap` in
  `js/modals.js`) is shared by the panels and every modal.
- **Toast queue with a visible cap.** Rapid-fire or repeated actions no
  longer stack an unbounded pile of toast notifications; at most 3 are
  shown at once, with any more queued and shown in order as earlier ones
  clear.

## Status: v2.1 — Data & State

Building on v2, this update implements the "Data & State" section of
`ROADMAP.txt`:

- **Real dataset, not hardcoded markup.** 14 customers, 12 car wash jobs, and
  8 maintenance jobs now live as JSON in `js/data.js` and are rendered into
  the DOM by `js/script.js` — adding a record means editing data, not copying
  table markup.
- **localStorage persistence.** Data loads from `localStorage` on boot (with
  the seed dataset as a fallback) and is saved back after any mutation, so
  state survives a refresh. Try it: open a customer, click "Deactivate
  Account," then reload the page — the status sticks.
- **Working sort.** The "Filter by" dropdown on Customers actually re-sorts
  the table now (Total Spend, Last Visit, Date Added).
- **Real pagination.** Page numbers, prev/next, and disabled states are all
  computed from the actual filtered/sorted dataset rather than being static
  buttons.
- **Empty states.** Filtering or searching to zero results shows a friendly
  message instead of a blank table.
- **Shareable URLs.** The active page, status filter, search term, and
  pagination page are mirrored into the URL query string (e.g.
  `?view=customers&status=vip&q=volkov`) and restored on load, so a view can
  be bookmarked or shared.

`Mark Complete` (car wash / maintenance jobs) and `Deactivate Account`
(customers) are wired to real mutations against this data layer as a
demonstration that it's live, not decorative.

## Status: v2

v2 is a full rebuild following a Playwright-based audit of v1, plus a file
restructure: the original single self-contained `index.html` (with inline
`<style>` and `<script>` blocks) has been split into `index.html`,
`css/styles.css`, and `js/script.js` for easier ongoing development.

All 15 issues found in that audit have been fixed:

**Functional bugs**
- Scroll position now correctly resets to top on page navigation
- Car Wash Jobs rows open a real Job Detail panel (previously showed a clickable
  cursor with no handler)
- The "more options" (⋮) button in table rows no longer triggers the parent
  row's click handler (`stopPropagation` added)

**Responsive layout**
- Sidebar collapses to icon-only below the `lg` (1024px) breakpoint instead of
  causing horizontal overflow
- Icon-bearing containers (avatars, badges, stat chips) clip overflow instead of
  breaking layout if the icon font fails to load
- Long customer names/emails truncate with a native tooltip instead of
  colliding with adjacent columns

**Previously inert UI**
- Status filter tabs (All / In Progress / Completed / On Hold, etc.) now
  actually filter the visible rows
- Pagination controls have real active-page state and disable at the
  start/end
- The header search live-filters whichever table is on screen, with a
  keyword-based page-routing fallback elsewhere
- Every remaining placeholder action (Generate Report, Export CSV, Restock,
  Reorder, etc.) gives toast feedback instead of doing nothing silently

**Accessibility**
- Sidebar navigation converted to real `<button>` elements (keyboard
  focusable and activatable by default)
- Table rows that open detail panels have `tabindex`, `role="button"`,
  keyboard handlers, and descriptive `aria-label`s
- Icon-only buttons have `aria-label`s; the active nav item gets
  `aria-current="page"`
- Detail panels are `role="dialog"`, manage focus on open/close, and close on
  `Escape`

**Resilience**
- Tailwind is now compiled to static CSS and embedded directly in the file —
  the app no longer depends on `cdn.tailwindcss.com` at runtime
- Font stacks have proper system-font fallbacks if Google Fonts is blocked
- The one hotlinked preview image was replaced with a CSS-generated initials
  avatar — no external image dependency remains

**Design system**
- All raw Tailwind palette colors (blue-100, green-700, amber-500, etc.) on
  status badges replaced with the Luminous Care semantic tokens. Added
  `warning` / `warning-container` / `on-warning-container` tokens since the
  design spec calls for amber semantics that weren't yet defined.

## Stack

- HTML / CSS / JS, split into separate files (see Project structure below)
- Tailwind CSS v3, compiled via the Tailwind CLI to static CSS — not the
  runtime CDN script
- Material Symbols icon font + Plus Jakarta Sans / Hanken Grotesk (Google
  Fonts — only remaining external dependency)
- Vanilla JS, no framework
- npm + the Tailwind CLI for the CSS build; Playwright for the test suite;
  `http-server` to serve the static files locally and in CI

## Project structure

```
washtrack/
├── index.html            HTML structure only — links to css/ and js/
├── css/
│   ├── input.css          Tailwind SOURCE file (@tailwind directives +
│   │                       hand-written app styles) — edit this, not
│   │                       styles.css directly
│   └── styles.css         COMPILED output of input.css — generated by
│                           `npm run build:css`, don't hand-edit
├── js/
│   ├── data.js            seed dataset (customers, car wash jobs, maintenance
│   │                       jobs, expenses) + localStorage load/save helpers +
│   │                       create/cancel mutation functions
│   ├── dropdown.js         reusable accessible custom dropdown component,
│   │                       used in place of native <select> elements
│   ├── modals.js           generic modal shell, shared focus-trap utility,
│   │                       form validation helpers, and the New Job / New
│   │                       Customer / Add Expense / confirmation dialogs
│   └── script.js          rendering, navigation, panels, filters, pagination,
│                           search (debounced), sort, URL state, toast queue,
│                           and the delegated data-action click dispatcher
├── tests/                 Playwright test suite (see "Testing" below)
├── playwright.config.js   Playwright config (Chromium + mobile Safari)
├── tailwind.config.js     Tailwind config matching DESIGN.md tokens
├── package.json           npm scripts: build:css, watch:css, start, test
├── .github/workflows/
│   └── tests.yml          CI: runs the Playwright suite on every push/PR
├── DESIGN.md              "Luminous Care" design system spec
├── ROADMAP.txt            v3 planning doc (improvements + new features)
└── README.md
```

`index.html` no longer contains any inline `<style>` or `<script>` blocks,
or any inline `onclick="..."` attributes — everything lives in
`css/styles.css`, `js/*.js`, and `data-action`/`data-arg` markup attributes
respectively.

## Design system

See [`DESIGN.md`](./DESIGN.md) for the full "Luminous Care" design spec
(colors, typography, spacing, component rules).

## Build & run

```bash
npm install          # one-time setup
npm run build:css    # compile css/input.css -> css/styles.css (minified)
npm run start        # serve the repo at http://127.0.0.1:4173
```

`css/styles.css` is a generated file, committed so GitHub Pages (which just
serves static files, with no build step of its own) has an up-to-date
stylesheet without needing a deploy-time build. If you add new Tailwind
utility classes anywhere in `index.html` or `js/**/*.js`, re-run
`npm run build:css` (or `npm run watch:css` while developing) before
committing — otherwise the new classes won't have matching CSS.

## Testing

```bash
npm test              # run the full Playwright suite headlessly
npm run test:ui       # interactive UI mode
npm run test:headed   # headed browser windows
```

The suite (`tests/*.spec.js`) covers navigation between pages, data
rendering from `js/data.js`, search/filter/pagination, form mutations +
`localStorage` persistence, keyboard accessibility and focus-trapping in
modals/side panels, and responsive/visual smoke checks — run against both
a Chromium and a mobile Safari (WebKit) project via `playwright.config.js`.
`.github/workflows/tests.yml` runs the same suite on every push and pull
request; the HTML report is uploaded as a build artifact on each run.
