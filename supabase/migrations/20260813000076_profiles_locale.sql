-- Recipient locale for server-rendered notifications (Phase 2 email digest);
-- in-app rendering still goes through next-intl based on the active cookie.
alter table public.profiles
  add column locale text not null default 'ro'
  check (locale in ('ro', 'hu', 'en'));
