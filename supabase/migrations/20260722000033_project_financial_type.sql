-- Financial type enum: whether a project is funded from own funds or an external financing source.
create type public.project_financial_type as enum ('proprii', 'finantare');

alter table public.projects
  add column financial_type public.project_financial_type;

update public.projects
  set financial_type = 'proprii';

alter table public.projects
  alter column financial_type set not null,
  alter column financial_type set default 'proprii';
