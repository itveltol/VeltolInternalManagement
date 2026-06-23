# Scaffold prompt — Veltol Project Cloud (base app)

> Paste this into your coding agent inside VSCode, run from the repo root.
> `DESIGN-SYSTEM.md` is in this folder — read it first and treat it as the source of truth for all visual decisions.

---

## Role & goal

You are setting up the **base** of an internal web application for **Veltol Holding S.R.L.** Build a production-shaped scaffold — not a throwaway demo. Deliver: project setup, routing, a Supabase email/password auth page, a protected app shell (collapsible side navbar + topbar), a dashboard, and a projects page. Use **mock data** for now (no DB queries yet) but structure the code so Supabase queries can drop in later.

**Before writing any code, read `DESIGN-SYSTEM.md` in the repo root in full.** Every color, font, gradient, shadow, spacing, and component pattern must come from that file. Do not invent visual styles or hardcode hex values in components — derive everything from the tokens defined there.

## Stack (use exactly this)

- **Next.js** (latest, **App Router**, `src/` directory, TypeScript, ESLint)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** for auth (`@supabase/supabase-js`, `@supabase/ssr`)
- **lucide-react** for icons
- Google Fonts via `next/font/google`: Audiowide, Space Grotesk, Inter, JetBrains Mono
- Target deploy: **Vercel** (keep everything edge/serverless-friendly)
- UI copy language: **Hungarian**

## Setup steps

1. Scaffold with `create-next-app` (App Router, TypeScript, Tailwind, `src/`, `@/*` alias).
2. `npx shadcn@latest init`, then add: `button card input label badge avatar dropdown-menu separator`.
3. Install `@supabase/supabase-js @supabase/ssr lucide-react`.
4. Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` placeholders, and a `.env.example` mirroring them. Never hardcode keys.

## Foundation files (do these first, from DESIGN-SYSTEM.md)

Implement the three "Quick start" files exactly as the guide specifies:

- `tailwind.config.ts` — register all `veltol-*` colors, the named gradients (`v-gradient`, `v-gradient-soft`, `v-gradient-line`, `v-gradient-aurora`), shadows (`v-glow`, `v-glow-lg`, `v-aqua-sm`), and font families (`brand`, `display`, `sans`, `mono`).
- `src/app/globals.css` — `:root` color tokens, the `.dark body` aurora canvas, and utility classes: `.mono-label`, `.v-panel`, `.v-hairline`, `.v-text-gradient`, `.v-live-dot` (+ its `pulse-dot` keyframes).
- `src/app/layout.tsx` — import the 4 Google fonts, assign CSS variables on `<html>`, force **dark mode** (`className="dark"`), set Hungarian `lang="hu"`.

Wire shadcn's CSS variables (`--card`, `--background`, `--muted`, etc.) to the Veltol surface hierarchy so shadcn components inherit the brand automatically.

## Supabase auth

- `src/lib/supabase/client.ts` (browser client) and `src/lib/supabase/server.ts` (server client via `@supabase/ssr` cookies).
- `src/middleware.ts` — refresh the session and **protect all `(app)` routes**; unauthenticated users redirect to `/login`, authenticated users hitting `/login` redirect to `/dashboard`.
- Sign-in is **email + password** (`signInWithPassword`). Include sign-out wired to the user footer in the sidebar.

## Routing structure

Use route groups so the auth page has no app shell and the app pages share one layout:

```
src/app/
  layout.tsx                      # root: fonts, dark mode, <html lang="hu">
  (auth)/
    login/page.tsx                # full-screen, bg-v-gradient-aurora hero
  (app)/
    layout.tsx                    # the app shell: sidebar + topbar
    dashboard/page.tsx
    projects/page.tsx
```

Root `/` redirects to `/dashboard`.

## What to build on each screen

**Login (`/login`)** — Centered glass card (`.v-panel`) over the `bg-v-gradient-aurora` background. Veltol wordmark in `font-brand`. Email + password fields (shadcn `Input`/`Label`), submit button, inline error state in `text-veltol-red`. Mono eyebrow label above the title.

**App shell (`(app)/layout.tsx`)** — Implement the "Layout shell" section of the guide exactly: `h-screen flex overflow-hidden`, a `w-64` frosted sidebar (`backdrop-blur-xl`, right border) and a `flex-1` column with a `h-[62px]` frosted topbar over a scrollable `main`. Sidebar contains: brand lockup, a project switcher (static for now), the nav, and a user footer with avatar + sign-out. Nav items use the **active** (aqua border/tint/text) and **inactive** states from the guide; the active item is derived from the current pathname. Group nav items under mono group labels.

**Dashboard (`/dashboard`)** — Standard page header (mono eyebrow `IRÁNYÍTÓPULT · ÁTTEKINTÉS`, `font-display` title, description). A KPI row: one **featured gradient** KPI card + three **plain glass** KPI cards per the guide's two card patterns (include the top hairline). Below, a glass content card listing recent projects with status `Badge`s. All numbers use `font-mono tabular-nums`. Include one "Live" pill.

**Projects (`/projects`)** — Page header (`PROJEKTEK · ÖSSZES`). A glass card containing a projects table: columns like Projekt, Helyszín, Kapacitás (MWp), Állapot, Határidő. Status column uses the badge variants mapped to project phases (Ajánlat, Tervezés, Engedélyezés, Kivitelezés, Garancia, Lezárt, Törölt). Tabular-nums on all numeric/date cells. Top hairline on the card.

## Mock data

Put sample data in `src/lib/mock-data.ts` with TypeScript types (`Project`, `ProjectStatus`, `KpiCard`). Use realistic Hungarian-labeled solar/BESS project entries (name, location, capacity, status, deadline, value in EUR). Components import from here; later this file gets replaced by Supabase queries with the same return shapes.

## Design rules (enforce from the guide)

Dark-mode first · mono labels on every eyebrow/section/KPI/nav-group · the gradient spine only on featured KPI card + V-mark + avatar · aqua = active signal, green = success/live only · top hairline on every glass card · backdrop-blur on all floating surfaces · no decorative gradients · tabular-nums for all data.

## Acceptance criteria

- `npm run dev` runs clean; `npm run build` passes with no type errors.
- Visiting any `(app)` route while signed out redirects to `/login`; after sign-in lands on `/dashboard`.
- No hardcoded hex values in components — only `veltol-*` / shadcn token classes.
- Sidebar active state correctly reflects the current route.
- Layout matches the guide's shell dimensions (`w-64` sidebar, `h-[62px]` bars).
- All UI copy is in Hungarian.

When done, list the files you created and any commands I need to run (e.g. Supabase project setup, env vars).
