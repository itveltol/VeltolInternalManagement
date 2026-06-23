create table public.checklist_daily_log (
  id            bigint primary key generated always as identity,
  item_id       bigint not null references public.project_checklist_items (id) on delete cascade,
  log_date      date not null default current_date,
  realizat      integer not null,
  updated_at    timestamptz not null default now(),
  unique (item_id, log_date)
);

create trigger checklist_daily_log_updated_at
  before update on public.checklist_daily_log
  for each row execute function public.set_updated_at();

alter table public.checklist_daily_log enable row level security;

create policy "daily_log: authenticated select"
  on public.checklist_daily_log for select
  using (auth.uid() is not null);

create policy "daily_log: mutators insert"
  on public.checklist_daily_log for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "daily_log: mutators update"
  on public.checklist_daily_log for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'project_manager')
  ));

create policy "daily_log: admin delete"
  on public.checklist_daily_log for delete
  using (is_admin());

create index daily_log_item_id_idx
  on public.checklist_daily_log (item_id);
