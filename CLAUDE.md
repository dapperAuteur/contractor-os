# Work.WitUS — Code Style & Quality Guidelines

## "Clean Slate" Light Theme — Color System

The contractor dashboard uses a **light "Clean Slate" theme** (inspired by Linear/Vercel/Stripe). The login page remains dark for brand identity.

### Dashboard page & content area (light):
- Page background: `bg-slate-50`
- Card / section background: `bg-white`
- Card border: `border-slate-200`
- Heading text: `text-slate-900`
- Body / secondary text: `text-slate-500`
- Form labels: `text-slate-700`

### Standard form input (dashboard):
```
w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900
placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30
```

### Standard label (dashboard):
```
block text-sm font-medium text-slate-700 mb-1
```

### NEVER use `gray-*` in the dashboard — always use `slate-*` equivalents.

### Login / auth pages (dark — preserved for branding):
- Background: `bg-neutral-950`, card: `bg-neutral-900`, border: `border-neutral-800`
- Text on dark: `text-neutral-100` (primary), `text-neutral-300` (labels), `text-neutral-400` (secondary)
- Inputs on dark: `border-neutral-700 bg-neutral-800 text-neutral-100 focus:ring-amber-500`
- Wrap dark form pages with `dark-input` class for browser-native icon rendering

### Admin pages (dark):
- Use `dark-input` wrapper class — it applies `color: #e5e7eb` and `color-scheme: dark` to all inputs so native browser icons render correctly

### Accent colors by product:
- **Contractor (Work.WitUS):** `amber` — buttons: `bg-amber-600 hover:bg-amber-500`, text: `text-amber-400` (dark) / `text-amber-600` (light), focus: `focus:ring-amber-500`
- **Lister (CrewOps):** `indigo` — buttons: `bg-indigo-600 hover:bg-indigo-500`, text: `text-indigo-400`, focus: `focus:ring-indigo-500`

---

## Mobile-First & Touch Targets

- All interactive elements (buttons, links acting as buttons, icon buttons) must have a **minimum touch target of 44x44px** (`min-h-11 min-w-11`)
- Use `min-h-11` on all `<button>` and `<Link>` elements that act as buttons
- Icon-only buttons: `min-h-11 min-w-11 flex items-center justify-center`
- Stack buttons vertically on mobile, horizontally on desktop: `flex flex-col sm:flex-row`
- Keep primary action buttons within thumb reach (bottom of viewport on mobile)

---

## ARIA & Accessibility

- Every `<button>` without visible text must have `aria-label`
- Decorative icons: `aria-hidden="true"`
- Loading states: `aria-label="Loading..."` or `role="status"` with screen-reader text
- Lists of items: `role="list"` on container when semantic `<ul>` is not used
- Form inputs: always pair with `<label>` using `htmlFor`/`id`
- Error messages: `role="alert"` on error containers
- Expandable menus: `aria-expanded` on toggle buttons

---

## App Architecture

- This is a standalone Work.WitUS app (contractor + lister). No subdomain detection.
- `useAppMode()` always returns `'contractor'`.
- Lister users are detected via `profile.contractor_role === 'lister'` in the dashboard layout.
- Login/signup always show Work.WitUS branding (amber accent, dark theme).
- Post-login redirect: `/dashboard/contractor` (or user's `dashboard_home` preference).
- Blog is admin-only (locked for non-admin users).
- MFA is optional — users can enable/disable in settings, not enforced in middleware.

---

## Shared Database

This app shares a Supabase database with CentenarianOS. See `SHARED_DB.md` for details.
- **Always use `IF NOT EXISTS` / `IF EXISTS`** in migrations
- **Never drop columns** without checking both repos
- **Copy new migrations to both repos** to keep schema history in sync
- When adding columns that only Work.WitUS uses, document them in `SHARED_DB.md`

---

## General Code Patterns

- Use `.maybeSingle()` not `.single()` for Supabase queries that may return no rows
- Service role client (`SUPABASE_SERVICE_ROLE_KEY`) for API routes bypassing RLS
- Tailwind v4: `shrink-0` not `flex-shrink-0`, `bg-linear-to-b` not `bg-gradient-to-b`
- Dashboard uses `slate-*` colors (light theme) — never use `gray-*` or `neutral-*` in dashboard pages
- Login/admin pages use `neutral-*` colors (dark theme) — never use `gray-*` or `slate-*` there
- Most common contrast bug: using `text-gray-*` anywhere (wrong scale for both dark and light contexts)
