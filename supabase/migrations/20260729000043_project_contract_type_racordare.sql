-- Adds "racordare" (grid connection) as a fourth contract_type value. Unlike
-- proiectare/executie/mentenanta, racordare does not gate any Matrice phase
-- range — it's a label/filter-only value with no phase-eligibility mapping.
alter type public.contract_type add value 'racordare';
