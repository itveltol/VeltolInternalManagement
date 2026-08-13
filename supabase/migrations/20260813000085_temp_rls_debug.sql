-- TEMPORARY diagnostic function — drop after debugging the notes RLS issue.
create or replace function public.debug_rls_context()
returns table (v_current_user text, v_current_role text, v_session_user text, v_auth_uid uuid, v_jwt_claims text)
language sql stable as $$
  select current_user::text, current_role::text, session_user::text, auth.uid(), current_setting('request.jwt.claims', true)
$$;
