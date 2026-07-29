-- Second, independent price field in Romanian Lei alongside value_eur.
-- No exchange-rate conversion — entered manually, same as value_eur.
alter table public.projects add column value_lei bigint;
