# Implementation plan — Matrice Status

Feature port of the `Matrice Status` sheet from `VeltolEnergy_Tracker_MultiProj` into the web app
(Next.js App Router · TypeScript · Supabase · Tailwind/shadcn · Veltol design system).

## Decisions (locked)

- **Catalog:** fixed ~95-activity / 12-phase list taken verbatim from the `Matrice Status` sheet (not the per-type `_Activitati_Template`).
- **View:** matrix as the main page, with a **project picker** — the user chooses which / how many projects appear as columns.
- **% complete:** simple count — `finalizat / (total non-N/A)`, per row, per phase, and per project.
- **N/A:** auto-assigned by project type (BESS activities → only BESS-bearing types), manually overridable.

## What it is

A grid of **activities (rows, grouped into 12 phases) × projects (columns)**. Each cell holds one status. Six statuses, mapped to design tokens:

| Status | Value | Color token |
|---|---|---|
| ✅ Finalizat | `finalizat` | `veltol-green` |
| 🔄 În progres | `in_progres` | `veltol-aqua` |
| ⏳ În așteptare | `in_asteptare` | `veltol-amber` |
| ❌ Blocat | `blocat` | `veltol-red` |
| ⬜ Neînceput | `neinceput` | `veltol-fgMute` |
| ➡️ N/A | `na` | faint / muted |

## Data model (Supabase / Postgres)

```sql
create type activity_status as enum
  ('finalizat','in_progres','in_asteptare','blocat','neinceput','na');

create type project_type as enum
  ('CEF','CEF cu BESS','BESS in CEF existent','BESS Stand-alone');

-- catalog (seeded once, see seed-activities.sql)
create table activities (
  id            bigint generated always as identity primary key,
  phase_no      int  not null,
  phase_name    text not null,
  name          text not null,
  sort_order    int  not null,
  is_section_header boolean not null default false,
  applies_to    project_type[]        -- null = applies to all types
);

-- assumes a projects table; add the type column if missing
alter table projects add column if not exists project_type project_type;

-- one row per (project, activity) — the cells
create table project_activity_status (
  project_id   bigint not null references projects(id) on delete cascade,
  activity_id  bigint not null references activities(id) on delete cascade,
  status       activity_status not null default 'neinceput',
  note         text,
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now(),
  primary key (project_id, activity_id)
);
create index on project_activity_status (activity_id);
```

**Sparse storage:** a missing `(project, activity)` row = `neinceput`. Rows are created lazily on first edit (upsert). This avoids pre-filling ~95 × N cells.

**Auto-N/A:** when a project is created (or its type changes), upsert `na` for every activity whose `applies_to` excludes that type. Implement as a Postgres trigger or a server action — trigger is cleaner and keeps it consistent regardless of entry point.

## Percent-complete (derived, never stored)

Simple count, ignoring `na` and section-header rows:

```sql
create view v_activity_progress as
select activity_id,
       count(*) filter (where status='finalizat')::numeric
         / nullif(count(*) filter (where status <> 'na'),0) as pct
from project_activity_status
group by activity_id;
```

Per-project % and per-phase % follow the same shape (group by `project_id`, and by `phase_no`). Section-header activities are excluded from all denominators. Compute these in SQL views and read them, or derive client-side from the loaded cells — for a single matrix page, client-side is simplest and avoids a round-trip.

## API / data access

- `getMatrix(projectIds: number[])` → activities (ordered by `sort_order`) + the status cells for the selected projects. One query each, joined client-side.
- `setCellStatus(projectId, activityId, status)` → upsert into `project_activity_status`, set `updated_by`/`updated_at`. Optimistic UI update, rollback on error.
- Optional later: Supabase **Realtime** subscription on `project_activity_status` for live multi-user edits.

## UI (Veltol design system)

Route: `/(app)/matrice-status`. Add a sidebar nav item (mono group label, aqua active state).

- **Project picker** — multi-select of projects to show as columns (persist the selection in `localStorage`). Drives `getMatrix`.
- **Matrix grid** — `v-panel` card with top hairline. Sticky left columns (phase · activity · row %) and a sticky header row (project names + type badge). Project columns scroll horizontally.
- **Phase rows** — collapsible section headers (`mono-label`, phase % bar in the gradient line). Collapsing hides that phase's activities.
- **Cells** — each is a status pill (color from the table above) that opens a shadcn dropdown to change status; writes optimistically. Tabular-nums on all % values.
- **Legend** — the 6-status key, styled as small pills, matching the sheet's header band.
- **Column footer** — per-project overall % (the headline number per project).

Performance note: ~95 rows × up to 20 columns ≈ 1,900 cells. Fine to render directly; if the picker allows many projects, virtualize rows.

## Build order

1. Migration: enums, `activities`, `project_activity_status`, `projects.project_type`, progress views.
2. Run `seed-activities.sql` to load the catalog.
3. Auto-N/A trigger + backfill for existing projects.
4. RLS policies (read: authenticated; write: authenticated, stamp `updated_by`).
5. Data layer (`getMatrix`, `setCellStatus`).
6. Matrix page UI + project picker + legend.
7. Verify: row/phase/project % match the sheet on a sample project; N/A auto-applies correctly per type.

## Open items to confirm

- **`applies_to` accuracy.** The seed currently marks only BESS-named activities and the whole *Montaj BESS* phase as BESS-only; everything else applies to all types. The sheet itself doesn't encode per-type applicability (it's all manual N/A), so this is the one place needing your domain rules — e.g. should `BESS in CEF existent` projects skip the CEF permitting/execution phases? Give me the type→phase rules and I'll refine the seed.
- **Source of truth.** Is the web app replacing the Excel, or syncing with it? If syncing is needed, that's a separate import/export task.
- **Project switcher vs. picker.** You already have a per-project sidebar switcher in the base app — confirm the matrix picker is independent (multi-project) from that.
