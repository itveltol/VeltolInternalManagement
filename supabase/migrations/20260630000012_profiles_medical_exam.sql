alter table public.profiles
  add column medical_exam_expires_at date;

create index profiles_medical_exam_expires_at_idx
  on public.profiles (medical_exam_expires_at)
  where medical_exam_expires_at is not null;
