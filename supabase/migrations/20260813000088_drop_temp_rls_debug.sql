-- Drops the temporary diagnostic function added while debugging the notes
-- RLS/RETURNING bug (see 20260813000087_create_note_via_rpc.sql).
drop function if exists public.debug_rls_context();
