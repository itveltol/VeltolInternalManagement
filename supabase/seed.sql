-- Promote it@veltol.com to super_admin.
-- Run after migrations. Safe to re-run (no-op if user doesn't exist yet).
update public.profiles
set role = 'admin'
where email = 'it@veltol.com';
