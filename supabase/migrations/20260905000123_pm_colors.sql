-- Explicit, admin/PM-assignable color per project manager, replacing the
-- earlier per-assignment color swatch — schedule cards are colored by their
-- PM everywhere, and this is the persisted mapping behind that.
create table public.pm_colors (
  pm_id      uuid primary key references public.profiles (id) on delete cascade,
  color      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create trigger pm_colors_updated_at
  before update on public.pm_colors
  for each row execute function public.set_updated_at();

alter table public.pm_colors enable row level security;

create policy "pm_colors: authenticated select"
  on public.pm_colors for select
  to authenticated
  using (true);

create policy "pm_colors: admin and pm can insert"
  on public.pm_colors for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "pm_colors: admin and pm can update"
  on public.pm_colors for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );

create policy "pm_colors: admin and pm can delete"
  on public.pm_colors for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'project_manager')
    )
  );
