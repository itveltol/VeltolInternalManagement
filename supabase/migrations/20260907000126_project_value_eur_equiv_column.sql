-- The contracts table filtered/sorted by value using the raw value_eur
-- column, which is null for any RON-denominated contract — such contracts
-- silently dropped out of value filters and mis-sorted. value_eur_equiv is a
-- generated EUR-equivalent (RON converted via the project's own pinned
-- conversion_rate, same convention as budgetLineAmountEur/contractValueEur)
-- so filtering/sorting can stay in the database regardless of currency.
alter table public.projects
  add column value_eur_equiv numeric generated always as (
    coalesce(
      value_eur,
      case
        when conversion_rate is not null and conversion_rate <> 0
          then value_lei / conversion_rate
        else null
      end
    )
  ) stored;
