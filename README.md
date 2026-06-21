# WashTrack Pro

A single-page admin dashboard for managing a car wash and automotive maintenance
business — Executive Dashboard, Car Wash Jobs, Maintenance Jobs, and Customer
Management.

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
│   └── script.js      all application logic (navigation, panels, filters,
│                       pagination, search, toasts)
├── DESIGN.md          "Luminous Care" design system spec
└── README.md
```

`index.html` no longer contains any inline `<style>` or `<script>` blocks —
everything lives in `css/styles.css` and `js/script.js` respectively.

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
