-- Facturat/încasat move from the manually-maintained project_billing table
-- to being derived from situație status: a situație counts as facturat once
-- it's finalized (invoiced to the client), and as încasat only once it has
-- actually been paid. This adds the third lifecycle state and drops the
-- table it replaces — see centralizerService.ts for the new derivation.

alter table public.situations
  drop constraint situations_status_check;

alter table public.situations
  add constraint situations_status_check check (status in ('draft', 'final', 'paid'));

alter table public.situations
  add column paid_at timestamptz;

-- Nothing left to read/write once facturat/încasat are situație-derived —
-- see the app-side removal of billingService/supabaseBillingClient and
-- updateContractAction's billing half in the same change.
drop table public.project_billing;

create or replace function public.fn_log_situation_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_project_name text;
begin
  if public.events_suppressed() then
    return coalesce(new, old);
  end if;

  select name into v_project_name from projects where id = new.project_id;

  if tg_op = 'INSERT' then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'situation.created', new.project_id, 'situations', new.id,
      jsonb_build_object('entityName', new.name, 'projectName', v_project_name));
    return new;
  end if;

  if new.status is distinct from old.status and new.status = 'final' then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'situation.finalized', new.project_id, 'situations', new.id,
      jsonb_build_object('entityName', new.name, 'projectName', v_project_name));
  end if;

  if new.status is distinct from old.status and new.status = 'paid' then
    insert into activity_events (actor_id, verb, project_id, entity_table, entity_id, summary)
    values (auth.uid(), 'situation.paid', new.project_id, 'situations', new.id,
      jsonb_build_object('entityName', new.name, 'projectName', v_project_name));
  end if;

  return new;
end;
$$;
