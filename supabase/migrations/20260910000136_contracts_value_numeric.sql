-- contracts.value_eur/value_lei were carried over from projects as bigint
-- (integer-only), which silently rejects/truncates fractional amounts
-- (e.g. 123456.50). Widen to numeric(14,2) so contract values can carry
-- cents. value_eur_equiv is a generated column derived from these two, so
-- it must be dropped and recreated around the type change.
alter table public.contracts drop column value_eur_equiv;

alter table public.contracts
  alter column value_eur type numeric(14, 2),
  alter column value_lei type numeric(14, 2);

alter table public.contracts
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
