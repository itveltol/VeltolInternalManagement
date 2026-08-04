-- Situations moved from itemized (per-checklist-line, manually priced) to a
-- whole-project snapshot: pct comes from overall checklist completion,
-- amount = pct × project.value_eur/value_lei. Drop the now-unused line-item
-- table and add the snapshot columns directly on situations. As with the
-- prior per-line snapshot columns, these stay null while status = 'draft'
-- (live-computed at render time) and are populated exactly once, at
-- finalize, so a situation's billed figures never silently change later.
drop table if exists public.situation_items;

alter table public.situations
  add column pct_snapshot        numeric,
  add column amount_eur_snapshot numeric,
  add column amount_lei_snapshot numeric;
