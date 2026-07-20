// One-off: set known passwords for the placeholder manager accounts created by
// create_managers.ts, so they can actually be used to log in and test the app.
import { resolve } from "path";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(resolve(__dirname, "../.env.local"));

const TARGETS = ["Nagy Ors"];

function genPassword(): string {
  return randomBytes(9).toString("base64url");
}

async function main() {
  const fs = await import("fs/promises");
  const managerIds: Record<string, string> = JSON.parse(
    await fs.readFile(resolve(__dirname, "manager_ids.json"), "utf-8"),
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE env vars");

  const admin = createClient(url, serviceKey);
  const results: Record<string, { email: string; password: string }> = {};

  for (const key of TARGETS) {
    const id = managerIds[key];
    if (!id) throw new Error(`No manager_ids.json entry for ${key}`);

    const password = genPassword();
    const { data, error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) throw new Error(`updateUserById failed for ${key}: ${error.message}`);

    const email = data.user!.email!;
    results[key] = { email, password };
    console.log(`${key} -> ${email} / ${password}`);
  }

  await fs.writeFile(
    resolve(__dirname, "manager_test_credentials.json"),
    JSON.stringify(results, null, 2),
    "utf-8",
  );
  console.log("Wrote scripts/manager_test_credentials.json (share these securely, then delete the file)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
