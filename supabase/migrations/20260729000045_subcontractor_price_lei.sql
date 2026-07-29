-- Second, independent price field in Romanian Lei alongside price_eur.
-- No exchange-rate conversion — entered manually, same as price_eur.
alter table public.subcontractors add column price_lei numeric;
