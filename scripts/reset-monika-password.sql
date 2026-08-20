-- One-off admin password reset for monika@veltol.com
-- Run manually in the Supabase SQL Editor (not a migration).
-- Requires pgcrypto (enabled by default on Supabase projects).
--
-- Generates a random password, hashes it the way Supabase Auth expects
-- (bcrypt via pgcrypto's crypt/gen_salt), and returns it as a result row.
-- Copy it immediately after running -- it is not stored anywhere in plaintext.

with new_pw as (
  select encode(gen_random_bytes(9), 'base64') as password
)
update auth.users
set encrypted_password = crypt(new_pw.password, gen_salt('bf')),
    updated_at = now()
from new_pw
where email = 'monika@veltol.com'
returning auth.users.email, new_pw.password as new_password;
