-- Reorder items within the "Documentare & Recepție" (phase 11) section
update activities set sort_order = 88 where phase_no = 11 and name = 'Cartea Construcțiilor';
update activities set sort_order = 89 where phase_no = 11 and name = 'Recepție Electrica';
update activities set sort_order = 90 where phase_no = 11 and name = 'Convenție Exploatare Contor';
update activities set sort_order = 91 where phase_no = 11 and name = 'Contract Furnizare Energie POD';
update activities set sort_order = 92 where phase_no = 11 and name = 'POD + Contor';
update activities set sort_order = 93 where phase_no = 11 and name = 'PRE (POD + Contract Furnizare + AI)';
update activities set sort_order = 94 where phase_no = 11 and name = 'Autorizația de Înființare ANRE (AI)';
