-- Change realizat from numeric(10,2) to integer
alter table public.project_checklist_items
  alter column realizat type integer using realizat::integer;

-- Add editable planning fields (previously static template-only values)
alter table public.project_checklist_items
  add column if not exists plan_total integer,
  add column if not exists zile       integer,
  add column if not exists target_zi  integer;
