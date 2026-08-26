-- 20260803000058_prevent_self_role_change.sql narrowed the authenticated UPDATE
-- grant on profiles to (first_name, last_name, phone, avatar_url, role), but two
-- columns updated by users on their own row via completeRegistration() and
-- setEmailDigestEnabledAction() were left out, causing "permission denied for
-- table profiles" on registration and the email digest toggle.

grant update (registered_at, email_digest_enabled) on public.profiles to authenticated;
