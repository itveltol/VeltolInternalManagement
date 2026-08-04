-- Prevent non-admins from changing their own role via "profiles: update own"
-- (that policy only checks auth.uid() = id, with no column restriction,
-- so any user could previously UPDATE profiles SET role = 'admin' on themselves)

create or replace function public.prevent_self_role_change()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

-- Column-level grant as defense in depth. Note: admins also update through
-- the "authenticated" Postgres role (RLS policy is what grants them the
-- extra access), so `role` must stay in this list — the trigger above is
-- what actually blocks non-admins from changing it.
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, phone, avatar_url, role) on public.profiles to authenticated;
