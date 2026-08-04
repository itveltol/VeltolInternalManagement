-- Situations compute amount_eur_snapshot/amount_lei_snapshot from
-- pct x project.value_eur/value_lei independently — but since the currency
-- migration only one of those is ever non-null on a project now, the other
-- currency's snapshot silently comes out null. Fix: derive the billed amount
-- from the project's actual source currency, convert the other one via a
-- rate locked in at finalize time (mirrors projects.conversion_rate — same
-- "frozen once, never recomputed" rule, just at finalize instead of create
-- since that's the one-shot moment a situation's figures are set).
alter table public.situations
  add column conversion_rate numeric;
