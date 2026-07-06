# WashTrack Pro

A single-page admin dashboard for managing a car wash and automotive maintenance
business — Executive Dashboard, Car Wash Jobs, Maintenance Jobs, and Customer
Management.

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
- Tailwind CSS, compiled to static CSS — not the runtime CDN script
- Material Symbols icon font + Plus Jakarta Sans / Hanken Grotesk (Google
  Fonts — only remaining external dependency)
- Vanilla JS, no framework, no build step required to run it

## Project structure

```
washtrack/
├── index.html        HTML structure only — links to css/ and js/
├── css/
│   └── styles.css     compiled Tailwind utilities + hand-written app styles
├── js/
│   ├── data.js         seed dataset (customers, car wash jobs, maintenance
│   │                    jobs, expenses) + localStorage load/save helpers +
│   │                    create/cancel mutation functions
│   ├── dropdown.js      reusable accessible custom dropdown component,
│   │                    used in place of native <select> elements
│   ├── modals.js        generic modal shell, shared focus-trap utility,
│   │                    form validation helpers, and the New Job / New
│   │                    Customer / Add Expense / confirmation dialogs
│   └── script.js       rendering, navigation, panels, filters, pagination,
│                        search, sort, URL state, toast queue
├── DESIGN.md          "Luminous Care" design system spec
├── ROADMAP.txt        v3 planning doc (improvements + new features)
└── README.md
```

`index.html` no longer contains any inline `<style>` or `<script>` blocks —
everything lives in `css/styles.css` and `js/*.js` respectively.

## Design system

See [`DESIGN.md`](./DESIGN.md) for the full "Luminous Care" design spec
(colors, typography, spacing, component rules).

## Running it

It's static files — open `index.html` in a browser, or serve the repo root
with any static file server (e.g. `npx serve .`). No build step is required
to *run* it.

## Rebuilding `css/styles.css`

If you add new Tailwind utility classes in `index.html`, `css/styles.css`
needs to be regenerated from a Tailwind config matching the design tokens in
`DESIGN.md`. (A `package.json` + build script will be added here once the
project moves to a proper build pipeline — see the v3 roadmap.)
