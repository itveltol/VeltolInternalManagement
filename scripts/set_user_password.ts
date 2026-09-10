// One-off: set a specific user's auth password by email.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... ENV_FILE=.env.production npx tsx scripts/set_user_password.ts vlad@veltol.com hCSxg8P5v8oV751Q

import { resolve } from "path";
import { createClient, type User } from "@supabase/supabase-js";

process.loadEnvFile(resolve(__dirname, "..", process.env.ENV_FILE ?? ".env.local"));

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npx tsx scripts/set_user_password.ts <email> <password>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE env vars");

  const admin = createClient(url, serviceKey);

  const result = await admin.auth.admin.listUsers();
  if (result.error) throw new Error(`listUsers failed: ${result.error.message}`);

  const users: User[] = result.data.users;
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error(`No auth user found for ${email}`);

  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) throw new Error(`updateUserById failed for ${email}: ${error.message}`);

  console.log(`Password updated for ${email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
