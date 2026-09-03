-- Drop "ELECTRICE" from the specialties activity name under
-- "Autorizație de construcție" (typo "AHITECTURA" kept as-is, matching source PDF).
update public.activities
set name = 'AHITECTURA / REZISTENTA'
where name = 'Ce specialitati facem * ( AHITECTURA / REZISTENTA / ELECTRICE ) sau daca are sa puna la dispozitie';
