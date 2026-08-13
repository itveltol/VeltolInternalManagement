-- Add 5 new activities to phase 4 (Certificat de Urbanism & Avize) and shift
-- sort_order for every later row by +5 to keep them after the new ones.
update public.activities
set sort_order = sort_order + 5
where sort_order >= 28;

insert into public.activities (phase_no, phase_name, name, sort_order, is_section_header, applies_to) values
  (4, 'Certificat de Urbanism & Avize', 'Acord acces DEER', 28, false, null),
  (4, 'Certificat de Urbanism & Avize', 'Aviz salubritate', 29, false, null),
  (4, 'Certificat de Urbanism & Avize', 'Aviz canalizare', 30, false, null),
  (4, 'Certificat de Urbanism & Avize', 'Localizare certă/incertă', 31, false, null),
  (4, 'Certificat de Urbanism & Avize', 'Dovadă OAR', 32, false, null);
