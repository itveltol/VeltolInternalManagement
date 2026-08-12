-- Manual RLS proof script for the comms module (Phase 1).
-- Not run automatically — there is no local Postgres/Docker available in
-- this environment to execute it. Run by hand against a local `supabase
-- start` stack (psql -f supabase/tests/comms_rls_proof.sql) before trusting
-- the policies in supabase/migrations/20260813000078_comms_rls.sql.
--
-- Each block sets the session to a specific auth.uid() via
-- `set local role authenticated; set local request.jwt.claims = ...` (the
-- standard supabase-postgres way to simulate a JWT locally) and asserts the
-- expected row count.

-- Setup: three profiles (owner, mentioned, other-viewer), one project each
-- managed by `owner`, and a private note authored by `owner` mentioning
-- `mentioned`.

-- 1. Constraint proof — these three inserts must all fail.
--    a) root note, no anchor, not personal
begin;
  savepoint s1;
  insert into notes (body, is_personal) values ('no anchor, not personal', false);
  -- expected: ERROR violates check constraint "notes_root_is_addressed"
  rollback to s1;
rollback;

--    b) root note, two anchors
begin;
  savepoint s1;
  insert into notes (body, project_id, client_id) values ('two anchors', 1, 1);
  -- expected: ERROR violates check constraint "notes_root_is_addressed"
  rollback to s1;
rollback;

--    c) reply carrying its own anchor
begin;
  savepoint s1;
  insert into notes (body, is_personal) values ('root', true);
  -- capture the id via \gset in psql, or hardcode for a one-off check
  insert into notes (body, parent_id, project_id) values ('reply with anchor', currval('notes_id_seq'), 1);
  -- expected: ERROR violates check constraint "notes_reply_has_no_anchor"
  rollback to s1;
rollback;

-- 2. RLS proof — run each block as the named user (swap the claims), then
--    as a different user, and diff the visible row count.
--
--    set local role authenticated;
--    set local request.jwt.claims = '{"sub": "<uuid-of-viewer>", "role": "authenticated"}';
--
--    a) a `viewer` cannot read another user's `private` note:
--       select count(*) from notes where id = <private_note_id>;  -- expect 0
--
--    b) a user mentioned in a `private` note CAN read it:
--       (as the mentioned user) select count(*) from notes where id = <private_note_id>;  -- expect 1
--
--    c) a PM sees `project`-visibility notes for their own projects and not others':
--       (as PM managing project A) select count(*) from notes where project_id = <project_A_id>;  -- expect >0
--       (as PM managing project A) select count(*) from notes where project_id = <project_B_id>;  -- expect 0
--
--    d) no authenticated user can insert into notifications directly:
--       insert into notifications (profile_id, type) values (auth.uid(), 'system');
--       -- expected: ERROR new row violates row-level security policy (no insert policy exists)
--
--    e) a user cannot write another user's note_receipts row:
--       insert into note_receipts (note_id, profile_id, seen_at) values (<any_note_id>, '<someone-elses-uuid>', now());
--       -- expected: ERROR new row violates row-level security policy for table "note_receipts"

-- 3. Mention notification proof:
--    as the author, insert a note with @mention, have the service layer
--    insert the corresponding note_mentions row, then as service-role:
--    select count(*) from notifications where note_id = <id> and type = 'mention';
--    -- expect exactly 1 row, for the mentioned profile_id, and 0 rows with
--    -- profile_id = the author's id.
