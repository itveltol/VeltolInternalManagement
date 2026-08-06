# VSCode prompt — Pénzügyi modul, Fázis 1

> Másold be az egészet a VSCode coding agentnek (Copilot / Claude Code). Önálló, de a repóban lévő `PLAN-modul-financiar.md`-re hivatkozik — az agent olvassa be azt is.

---

Implement **Phase 1 of the Financial module** for this project management app. The full design lives in `PLAN-modul-financiar.md` in the repo root — read it first, section 2 (margin model), 3 (data model), 5 (RLS), 6.1 (screen), and 8 (phasing). This task is **Phase 1 only**.

## Context / decisions (already made — do not re-ask)

- Reporting currency for all roll-ups: **EUR**.
- Accounting (SAGA) stays the source of truth for invoices — **do NOT build invoicing, AP/AR, or SAGA integration in this phase**. Those are Phase 2–4.
- Labor cost is **not** in scope (no pontaj module). Manoperă is just one budget category.
- Margin red-flag threshold: default **< 10%**, configurable (not hardcoded).
- Follow the existing codebase conventions exactly (see below). This repo has strict `tsc`, RLS-first Supabase, feature-slice architecture.

## Scope of Phase 1

Deliver the **foundation + a read-only margin skeleton**:

1. **`cost_categories`** reference table, seeded with: `equipment` (Echipamente), `labor` (Manoperă), `subcontractor` (Subcontractori), `transport` (Transport & logistică), `machinery` (Utilaje/închiriere), `permits` (Avize & taxe), `other` (Diverse/neprevăzute). Columns: `id`, `code` (unique), `name_ro`, `name_hu`, `name_en`, `sort_order`. Read-only to users (seed via migration).
2. **`project_budget_lines`** (deviz) — full CRUD. Columns per plan §3.2: `project_id` FK (on delete cascade), `cost_category_id` FK, `phase_no` int null, `description`, `qty` numeric, `unit` text, `unit_price` numeric, `currency` ('EUR'/'RON'), `conversion_rate` numeric (pinned at insert from `exchange_rates`, same pattern as `projects`), `amount` numeric (= qty × unit_price, computed in the service layer), `created_by` uuid FK → profiles (on delete set null), timestamps.
3. **`suppliers`** (furnizori) — full CRUD, modeled on the existing `subcontractors` feature. Columns: `id`, `name`, `cui`, `reg_com`, `contact_person`, `email`, `phone`, `address`, `iban`, `notes`, timestamps.
4. **Project detail → new "Financiar" tab**, read-only margin skeleton:
   - Header KPIs: **Valoare contract** (= project value, from `projects.value_*`), **Buget** (Σ budget lines), **Marjă bugetată** (Valoare contract − Buget) with **% and a red flag when margin % < 10%**.
   - (Angajat / Realizat / AR show as "—" placeholders this phase — wire them in Phase 2. Make the layout ready for them.)
   - Below KPIs: the **deviz table** grouped by cost category, with add/edit/delete (uses `project_budget_lines`).
   - All amounts normalized to **EUR** for the roll-up using each line's pinned `conversion_rate`.

## Conventions to follow (match existing code)

- **Migrations:** `supabase/migrations/YYYYMMDDNNNNNN_name.sql`, next sequential number after the latest existing one. Every table: `enable row level security`, a `set_updated_at` trigger, and RLS policies.
- **RLS:** create two security-definer helpers and use them (do NOT inline `role in (...)` subqueries — the codebase is migrating away from that):
  - `can_manage_finance()` = `role in ('admin','finance')`.
  - `can_read_project_financials(project_id bigint)` = admin OR finance OR the project's `manager_id = auth.uid()`.
  - Writes to `project_budget_lines`: gate on `can_mutate_projects()` (admin + PM). Writes to `suppliers`: `can_mutate_projects()`. Selects on `project_budget_lines`: `can_read_project_financials(project_id)`. `suppliers` select: authenticated. `cost_categories`: authenticated select, no user write.
- **Architecture:** feature-slice under `src/features/finance/` — `api/types.ts` (ApiClient interface), `api/supabaseFinanceClient.ts` (factory `(supabase) => client`), `services/*` (pure logic incl. the margin/EUR-normalization math), `components/*`. Route server actions in `src/app/[locale]/(app)/...`. Suppliers can live under `src/features/suppliers/` mirroring `subcontractors`.
- **Currency:** reuse the existing `exchange_rates` BNR helper and the `currency` + `conversion_rate` pattern already on `projects`/`project_subcontractors`. Pin `conversion_rate` at insert; never recompute historical rows against today's rate.
- **Validation:** use `zod` + the existing `parseFormData(schema, formData)` helper in every mutating server action.
- **Feedback:** use `sonner` toasts on action results (success + error), matching `MatriceShell`/`ProjectsTable`.
- **Loading/error:** add `loading.tsx` skeletons for any new route segment, matching the existing per-route skeletons.
- **i18n:** add all new UI strings as keys to `messages/ro.json`, `messages/hu.json`, `messages/en.json` — keep perfect key parity across all three (the repo currently has zero drift; don't introduce any). Romanian is the primary content; translate hu/en.
- **Types:** the repo has no generated Supabase types yet — hand-write feature types in `types.ts` matching the migration, and avoid `as unknown as` where a proper type works.
- **Roles:** the `finance` role already exists in the enum but is behaviorally inert — this is where it gets real capability via `can_manage_finance()`.

## Acceptance criteria

- `npx tsc --noEmit` passes clean.
- `npx eslint src` introduces no new errors.
- New migrations apply cleanly on top of the current schema; RLS verified: a `viewer` cannot read or write budget lines; a PM sees only their own projects' budgets; a `finance` user sees all.
- The Financiar tab renders the correct Buget total and Marjă bugetată (%), with the red flag under 10%, using EUR normalization.
- Suppliers and budget lines CRUD work end-to-end with toast feedback and zod validation.
- i18n key parity intact across ro/hu/en.

## Explicitly OUT of scope (do NOT build now)

- Purchase orders, supplier_invoices (AP), client_invoices (AR), payments, change_orders, retention.
- SAGA / CSV / API accounting integration.
- Portfolio-level financial dashboard and AR-aging.
- Pontaj / labor costing.
- Wiring Angajat / Realizat / cash-flow numbers (leave as placeholders).

Work in small commits: (1) migrations + RLS helpers + seed, (2) suppliers feature, (3) budget lines feature, (4) Financiar tab + margin service. Stop and summarize after Phase 1; do not start Phase 2.
