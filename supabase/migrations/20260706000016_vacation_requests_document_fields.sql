create type vacation_leave_type as enum ('rest', 'personal', 'medical');

alter table public.vacation_requests
  add column leave_type vacation_leave_type not null default 'rest',
  add column job_title text,
  add column superior_name text,
  add column substitute_name text;
