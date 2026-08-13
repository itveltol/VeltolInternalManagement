-- seed-activities.sql was accidentally run twice, duplicating every activity row
-- with new ids offset by 100 (e.g. id 1 duplicated as id 101). No project statuses
-- reference the duplicate ids, so it's safe to drop them outright.
delete from public.activities
where id >= 101;
