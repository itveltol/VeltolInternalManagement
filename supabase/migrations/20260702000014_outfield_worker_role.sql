-- Add outfield_worker as a new app_role value (read-only role, same access as site_engineer/finance/viewer)
alter type public.app_role add value if not exists 'outfield_worker';
