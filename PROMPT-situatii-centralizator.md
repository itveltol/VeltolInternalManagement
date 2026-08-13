# VSCode prompt — Situații → Centralizator contracte

> Másold be az egészet a VSCode coding agentnek (Copilot / Claude Code). Önálló, de a
> repóban lévő `PLAN-modul-financiar.md`-re és az `AUDIT-2026-08.md`-re hivatkozik — az
> agent olvassa be azokat is, valamint a teljes `src/features/situations/` szeletet.

---

Reshape the **Situații** module from a flat list of payment applications into a
**contract-level centralizer** (one row per contract), with the individual situations
becoming its drill-down detail. The target layout is the company's existing Excel
centralizer:

| Nr Contract | Beneficiar | Valoarea contractului | Valoare executată | Valoare facturată | Valoare încasată | Rămas de executat | Rămas de facturat | De încasat |
|---|---|---|---|---|---|---|---|---|
| grey | grey | grey | **derived** | *manual* | *manual* | grey | grey | grey |

In the source spreadsheet, yellow cells = manually maintained, grey = read-only/derived.

## Context / decisions (already made — do NOT re-ask, do NOT re-litigate)

1. **Row grain = one row per project.** A project *is* a contract here; use
   `projects.contract_number` for "Nr Contract" and `projects.client_id → clients.name`
   for "Beneficiar". Multi-contract projects (e.g. separate proiectare + execuție
   contracts on one site) are a **known, accepted limitation** — document it in a code
   comment on the centralizer service, do not build a `contracts` table.
2. **Valoare executată is computed, never typed.** It is `Σ` of that project's
   **finalized** situations (`status = 'final'`). Draft situations are excluded. This
   preserves the existing Matrice-driven, frozen-at-finalize audit rule — do not add a
   manual override.
3. **Facturat / Încasat are two manual numbers per contract.** Do NOT build
   `client_invoices`, `payments`, purchase orders, or any of `PLAN-modul-financiar.md`
   Phase 2. Just storage + inline editing for the two figures.
4. **VAT: store net, display gross.** Every existing money value in the schema
   (`projects.value_*`, `situations.amount_*_snapshot`, `project_budget_lines`) is **net**
   and stays net. Add a per-contract `vat_rate` and compute gross for display only.
   The column headers read `EUR + TVA` / `lei + TVA` because the displayed figures are gross.
5. **Both currencies (EUR + lei),** consistent with the current `SituationsTable`. Follow
   the established `currency` + `conversion_rate` pattern: the user's entered side is the
   source of truth, the other is derived from a rate pinned at insert. **Never recompute a
   historical row against today's rate.**
6. **The centralizer replaces the current `/situations` table** as the page's default view.

### Formulas (exact — these were chosen deliberately)

```
executatNet   = Σ situations[status='final'].amount_{eur,lei}_snapshot
grossOf(net)  = net × (1 + vat_rate / 100)

Valoarea contractului = grossOf(project.value_*)
Valoare executată     = grossOf(executatNet)
Valoare facturată     = grossOf(billing.invoiced_net)
Valoare încasată      = grossOf(billing.collected_net)

Rămas de executat = Valoarea contractului − Valoare executată
Rămas de facturat = Valoarea contractului − Valoare facturată     ← contract-based, NOT executat−facturat
De încasat        = Valoare facturată     − Valoare încasată
```

**Do not clamp the three derived columns at zero.** A negative value means
over-execution or over-invoicing against the contract — that is information, not noise.
Render negatives in `text-veltol-red`. (Note: this differs on purpose from
`computeSituationFigures`, which *does* clamp incremental pct at 0.)

## Scope

### 1. Migration — `project_billing` + `vat_rate`

New migration `supabase/migrations/YYYYMMDDNNNNNN_contract_billing.sql`, next sequential
number after the latest existing one (currently `20260811000073`).

```
projects: add column vat_rate numeric not null default 21
          check (vat_rate >= 0 and vat_rate <= 100)
```
Default 21 = the current Romanian standard rate; 0 must be allowed (reverse charge / export).

```
project_billing
  id              bigint PK generated always as identity
  project_id      bigint not null unique references projects(id) on delete cascade
  invoiced_net    numeric not null default 0
  collected_net   numeric not null default 0
  currency        text not null default 'EUR' check (currency in ('EUR','RON'))
  conversion_rate numeric                       -- EUR->RON pinned at first write
  notes           text
  updated_by      uuid references profiles(id) on delete set null
  created_at / updated_at timestamptz not null default now()
```

- `unique (project_id)` — one billing row per contract, written via **upsert on conflict
  `project_id`** (a project has no row until someone first enters a figure; treat a
  missing row as `0 / 0`).
- `enable row level security` + a `set_updated_at` trigger, like every other table.
- **RLS:**
  - *select:* `can_read_project_financials(project_id)` — admin OR finance OR the
    project's `manager_id = auth.uid()`. If that security-definer helper does not yet
    exist in the schema (it is specified in `PROMPT-finance-faza1.md`), create it in this
    migration. **Do not** inline a `role in (...)` subquery — the codebase is migrating
    away from that pattern.
  - *insert/update:* `can_manage_finance()` = `role in ('admin','finance')`. Create the
    helper if absent. **← If project managers must also maintain these two figures in
    practice, this is the one line to change: add `'project_manager'`. Ask before
    widening it.**
  - *delete:* `is_admin()`.
- Every write must set `updated_by = auth.uid()` from the server action — these are money
  figures and need an audit trail.

### 2. Centralizer data + pure service

- Extend `PROJECT_SELECT` in `src/features/situations/api/supabaseSituationsClient.ts` — it
  currently selects only `id, name, value_eur, value_lei, currency, conversion_rate,
  progress_pct`. Add `contract_number, contract_date, current_phase, vat_rate,
  client:clients(id, name)`.
- **Do not build a Postgres view.** Fetch three sets (projects, finalized situations,
  `project_billing`) and join them in the service layer with a **pure, unit-testable**
  function in `src/features/situations/services/centralizerService.ts`:

  ```ts
  export function buildCentralizerRows(
    projects: Project[],
    finalizedSituations: Situation[],
    billing: ProjectBilling[],
  ): CentralizerRow[]
  ```
  Each table's own RLS then applies naturally, with no `security_invoker` view semantics
  to reason about.
- A `CentralizerRow` carries, per currency, all 7 money figures **plus** the net values
  they came from, so the UI never recomputes VAT inline.
- Keep the gross conversion in one exported helper (`grossOf(net, vatRate)`); do not
  scatter `× 1.21` through components.
- **Every project the user can see gets a row**, including projects with zero situations
  (executată = 0) and zero billing.

### 3. UI

Replace `SituationsTable` as the default view of `/situations` with
`ContractCentralizerTable`:

- Columns exactly as the table at the top of this prompt, per currency. Because both
  currencies are in scope this is a wide table — follow the existing
  `TableShell` / `TableDesktopView` + `DataCardList` responsive split used by
  `SituationsTable`, and put the lei figures behind the same treatment other wide tables
  in this repo use. Mobile cards must stay legible: contract + beneficiar in the header,
  the money figures as `DataCardField`s.
- **Totals footer row**: sums of all 7 money columns across the *filtered* rows, both
  currencies. Visually distinct (`border-t-2`, `font-semibold`).
- **Filters:** the existing search (now over contract number + beneficiar + project
  name), plus a phase filter that **excludes `cancelled` projects by default** with a
  toggle to include them. Keep the existing `Pagination` at `PAGE_SIZE = 20`.
- **Inline editing** of Facturat / Încasat, gated on the finance-write permission
  (mirroring how `canMutate` is threaded from the page today). One dialog per contract
  (`EditContractBillingDialog`) with both figures, `currency`, and `notes` — not
  cell-level editing; this repo has no inline-edit pattern to follow.
- **Drill-down:** clicking a row opens that project's situations — the existing
  `SituationsTable` filtered to one project, then `SituationDetail` on a further click.
  Add `openProjectId` to `useSituationsStore` and route the three levels through
  `SituationsShell`. In the drill-down, `CreateSituationDialog` gets the project
  **prefilled**; the global "Adăugare situație" button with the project picker stays on
  the centralizer toolbar.

### 4. Housekeeping (in scope, cheap, do it)

- `AUDIT-2026-08.md:257` reported 36 TS errors in this feature after the
  `situation_items` → project-snapshot migration. The code now reads as migrated —
  **verify with `npx tsc --noEmit` before you start**, and fix anything left over first,
  in its own commit.
- `AUDIT-2026-08.md:191` flags `situations` having a `using (true)` select policy while
  projects are manager-scoped. Now that these figures roll up into a financial view,
  tighten it: `situations` select → `can_read_project_financials(project_id)`. Same
  migration, clearly separated.
- `SituationsTable:42` uses the browser's blocking `confirm()` — the repo has a
  `useConfirm` dialog; it is already used here. Do not regress it in the new table.

## Conventions to follow (match existing code)

- **Architecture:** feature-slice under `src/features/situations/` — `api/types.ts`
  (ApiClient interface), `api/supabaseSituationsClient.ts` (factory
  `(supabase) => client`), `services/*` (pure logic, no Supabase imports),
  `components/*`, `hooks/use*Store.ts` (zustand). Server actions live in
  `src/app/[locale]/(app)/situations/actions.ts`.
- **Next.js:** read `AGENTS.md` — this repo pins a Next version whose APIs differ from
  your training data. Consult `node_modules/next/dist/docs/` before writing route or
  server-action code.
- **Validation:** `zod` + the existing `parseFormData(schema, formData)` helper in every
  mutating server action. Server actions must **recompute from fresh DB state** and never
  trust client-supplied money figures — the same rule
  `finalizeSituationAction` already documents.
- **Feedback:** `sonner` toasts on action results (success + error), as in
  `MatriceShell` / `ProjectsTable`.
- **Currency:** reuse `convertCurrency` from `@/shared/utils/currency`, `formatCurrency`
  for display, and the `exchange_rates` BNR helper (`getTodaysRate`) to pin
  `conversion_rate` on first billing write.
- **i18n:** all new strings as keys under `situations.centralizer.*` in
  `messages/ro.json`, `messages/hu.json`, `messages/en.json` — **perfect key parity
  across all three** (the repo has zero drift today; do not introduce any). Romanian is
  the primary content. Reuse the Romanian column labels verbatim:
  `Nr Contract`, `Beneficiar`, `Valoarea contractului`, `Valoare executată`,
  `Valoare facturată`, `Valoare încasată`, `Valoare rămasă de executat`,
  `Valoare rămasă de facturat`, `De încasat`.
- **Types:** no generated Supabase types in this repo — hand-write feature types in
  `types.ts` matching the migration. Avoid `as unknown as` where a real type works.
- **Loading:** keep/extend `situations/loading.tsx` so the new wider table has a matching
  skeleton.

## Acceptance criteria

- `npx tsc --noEmit` passes clean; `npx eslint src` introduces no new errors.
- The migration applies cleanly on top of the current schema.
- RLS verified by hand: a `viewer` cannot read `project_billing`; a PM sees only their own
  projects' rows; a `finance` user sees all and can write; a PM **cannot** write billing
  (unless that decision was explicitly widened).
- A project with no situations and no billing row renders as a full row with
  `executată = 0`, `facturată = 0`, `încasată = 0`, and `rămas de executat = contract`.
- Gross figures = net × (1 + vat_rate/100), with `vat_rate = 0` producing net figures
  unchanged.
- Over-execution (executat > contract) renders a negative "rămas de executat" in red
  rather than 0.
- The totals footer matches the sum of the visible filtered rows, not the whole dataset.
- Drill-down works three levels deep (centralizer → project's situations → situation
  detail) and back, and creating a situation from the drill-down prefills the project.
- i18n key parity intact across ro/hu/en.
- `buildCentralizerRows` and `grossOf` have unit tests covering: zero situations, mixed
  EUR/RON source projects, `vat_rate = 0`, and over-execution.

## Explicitly OUT of scope (do NOT build)

- `client_invoices`, `payments`, `purchase_orders`, `supplier_invoices`, `change_orders`,
  retention — all of `PLAN-modul-financiar.md` Phase 2+.
- A `contracts` table / multi-contract-per-project support.
- Any accounting (SAGA / SmartBill) integration, CSV import, or invoice numbering.
- Manual override of Valoare executată.
- Portfolio financial dashboard, AR aging, cash-flow.
- Changing how `computeSituationFigures` or `finalizeSituationAction` compute a single
  situation's figures — that logic is correct and stays as is.

Work in small commits: (1) fix any leftover TS errors from the `situation_items`
migration, (2) migration + RLS helpers, (3) `project_billing` API/service/actions,
(4) `centralizerService` + unit tests, (5) `ContractCentralizerTable` + drill-down
rewiring, (6) i18n. Stop and summarize when done; do not start Phase 2 of the financial
module.
