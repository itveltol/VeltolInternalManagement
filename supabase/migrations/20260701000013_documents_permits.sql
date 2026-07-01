-- Add permit-specific fields to documents table

alter table public.documents
  add column if not exists category          text check (category in (
    'atr','cu','dtac','ac','aviz_mediu','aviz_isc','aviz_anre',
    'contract_racordare','receptie_terminare','other'
  )),
  add column if not exists status            text check (status in (
    'pending','submitted','obtained','rejected','expired'
  )),
  add column if not exists submitted_at      date,
  add column if not exists obtained_at       date,
  add column if not exists responsible_id    uuid references public.profiles(id) on delete set null,
  add column if not exists version           integer not null default 1;

-- Auto-expire: set status = 'expired' when expires_at passes and status is not already expired/obtained/rejected
create or replace function public.auto_expire_documents()
returns void
language sql
security definer
as $$
  update public.documents
  set status = 'expired'
  where
    expires_at is not null
    and expires_at < current_date
    and status not in ('expired', 'obtained', 'rejected');
$$;

-- pg_cron job: run daily at 01:00 UTC
-- Requires pg_cron extension enabled in Supabase dashboard (Database → Extensions → pg_cron)
-- Run once manually in SQL editor to register the job:
--
-- select cron.schedule(
--   'auto-expire-documents',
--   '0 1 * * *',
--   $$ select public.auto_expire_documents(); $$
-- );
