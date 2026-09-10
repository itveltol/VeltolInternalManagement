// One-off: create new Supabase accounts for project managers and set
// role='project_manager'. Requires the set_profile_role() SQL function
// (see supabase/migrations/20260909000134_promote_to_admin_fn.sql).
//
// Usage:
//   ENV_FILE=.env.local npx tsx scripts/create_project_managers.ts "email@veltol.com:First:Last" ...
//   SUPABASE_SERVICE_ROLE_KEY=... ENV_FILE=.env.production npx tsx scripts/create_project_managers.ts "email@veltol.com:First:Last"
//
// Each argument is "email:first_name:last_name" (last_name optional).

import { resolve } from "path";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(resolve(__dirname, "..", process.env.ENV_FILE ?? ".env.local"));

function parseArg(arg: string) {
  const [email, firstName, lastName] = arg.split(":");
  if (!email) throw new Error(`Invalid argument "${arg}", expected "email:first_name:last_name"`);
  return { email, firstName: firstName || null, lastName: lastName || null };
}

async function main() {
  const entries = process.argv.slice(2).map(parseArg);
  if (entries.length === 0) {
    console.error('Usage: npx tsx scripts/create_project_managers.ts "email@veltol.com:First:Last" ...');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE env vars");

  const admin = createClient(url, serviceKey);
  const results: Array<{ email: string; id: string; password: string }> = [];

  const skipped: string[] = [];

  for (const { email, firstName, lastName } of entries) {
    const { data: existing, error: lookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (lookupError) throw new Error(`profile lookup failed for ${email}: ${lookupError.message}`);

    if (existing) {
      const { error: roleError } = await admin.rpc("set_profile_role", {
        target_email: email,
        new_role: "project_manager",
      });
      if (roleError) throw new Error(`set_profile_role failed for ${email}: ${roleError.message}`);

      console.log(`${email} -> ${existing.id} already existed, set role=project_manager (no new password)`);
      skipped.push(email);
      continue;
    }

    const password = randomBytes(12).toString("base64url");

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser failed for ${email}: ${error.message}`);

    const id = data.user!.id;

    if (firstName || lastName) {
      const { error: nameError } = await admin
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", id);
      if (nameError) throw new Error(`name update failed for ${email}: ${nameError.message}`);
    }

    const { error: roleError } = await admin.rpc("set_profile_role", {
      target_email: email,
      new_role: "project_manager",
    });
    if (roleError) throw new Error(`set_profile_role failed for ${email}: ${roleError.message}`);

    results.push({ email, id, password });
    console.log(`${email} -> ${id} (role=project_manager)`);
  }

  if (results.length > 0) {
    console.log("\nCredentials (share securely, do not commit):");
    for (const r of results) {
      console.log(`  ${r.email}  ${r.password}`);
    }
  }
  if (skipped.length > 0) {
    console.log(`\nAlready existed, role set but no new password generated: ${skipped.join(", ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
