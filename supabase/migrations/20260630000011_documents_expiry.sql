alter table public.documents
  add column is_renewable boolean not null default false,
  add column expires_at   date;

create index documents_expires_at_idx on public.documents (expires_at)
  where expires_at is not null;
