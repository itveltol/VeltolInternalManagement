-- Helper to set a profile's role from a service-role context, where
-- auth.uid() is null so is_admin() (and thus the self-role-change guard
-- trigger) would otherwise reject the update regardless of target role.
create or replace function public.set_profile_role(target_email text, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table public.profiles disable trigger profiles_prevent_self_role_change;

  update public.profiles
  set role = new_role
  where email = target_email;

  if not found then
    alter table public.profiles enable trigger profiles_prevent_self_role_change;
    raise exception 'No profile found for email %', target_email;
  end if;

  alter table public.profiles enable trigger profiles_prevent_self_role_change;
end;
$$;

revoke all on function public.set_profile_role(text, public.app_role) from public, authenticated;
grant execute on function public.set_profile_role(text, public.app_role) to service_role;
