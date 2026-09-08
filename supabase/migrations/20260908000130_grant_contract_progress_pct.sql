-- contract_progress_pct() (added in 20260908000128_situations_contract_id.sql)
-- is called from the app via PostgREST RPC (supabase.rpc(...)), which
-- requires an explicit execute grant to the authenticated role — the same
-- convention already used for recompute_all_project_progress() and the
-- comms RPCs (create_note, get_mention_candidates, ...).
grant execute on function public.contract_progress_pct(bigint) to authenticated;
