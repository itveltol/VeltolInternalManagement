-- Project category enum: top-level distinction between residential and industrial projects.
-- Industrial projects keep using project_type ("technical type"); residential projects don't.
create type public.project_category as enum ('residential', 'industrial');

alter table public.projects
  add column project_category public.project_category;

-- Backfill: any row that already has a project_type is industrial; otherwise residential.
update public.projects
  set project_category = case when project_type is not null then 'industrial' else 'residential' end;

alter table public.projects
  alter column project_category set not null,
  alter column project_category set default 'industrial';
