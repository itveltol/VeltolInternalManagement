// One-off: create a placeholder Supabase account for a new person with a known
// password (unlike create_managers.ts, which discarded its random passwords).
import { resolve } from "path";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(resolve(__dirname, "../.env.local"));

const PERSON = { key: "Szente Tamas", first_name: "Tamas", last_name: "Szente", slug: "szente.tamas" };

function genPassword(): string {
  return randomBytes(9).toString("base64url");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE env vars");

  const admin = createClient(url, serviceKey);
  const email = `${PERSON.slug}@placeholder.veltol.local`;
  const password = genPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser failed for ${PERSON.key}: ${error.message}`);

  const id = data.user!.id;

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      first_name: PERSON.first_name,
      last_name: PERSON.last_name,
      role: "project_manager",
    })
    .eq("id", id);
  if (updateError) throw new Error(`profile update failed for ${PERSON.key}: ${updateError.message}`);

  console.log(`${PERSON.key} -> ${id} (${email}) / ${password}`);

  const fs = await import("fs/promises");

  const idsPath = resolve(__dirname, "manager_ids.json");
  const ids: Record<string, string> = JSON.parse(await fs.readFile(idsPath, "utf-8"));
  ids[PERSON.key] = id;
  await fs.writeFile(idsPath, JSON.stringify(ids, null, 2), "utf-8");

  const credsPath = resolve(__dirname, "manager_test_credentials.json");
  let creds: Record<string, { email: string; password: string }> = {};
  try {
    creds = JSON.parse(await fs.readFile(credsPath, "utf-8"));
  } catch {
    // file may not exist anymore if it was already cleaned up
  }
  creds[PERSON.key] = { email, password };
  await fs.writeFile(credsPath, JSON.stringify(creds, null, 2), "utf-8");

  console.log("Updated scripts/manager_ids.json and scripts/manager_test_credentials.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
