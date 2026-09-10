-- 20260803000058_prevent_self_role_change.sql narrowed the authenticated UPDATE
-- grant on profiles to (first_name, last_name, phone, avatar_url, role), but
-- medical_exam_expires_at (added by 20260630000012_profiles_medical_exam.sql) was
-- left out, causing "permission denied for table profiles" whenever an admin
-- edits an office user via the profile dialog (updateUser always sends this
-- column). Same class of bug as 20260825000105_profiles_grant_missing_columns.sql.

grant update (medical_exam_expires_at) on public.profiles to authenticated;
