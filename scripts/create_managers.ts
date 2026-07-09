// One-off: create placeholder Supabase accounts for the 7 Responsabil people
// found in the Contracte2025-2026 import. Real emails will be assigned later.
import { resolve } from "path";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(resolve(__dirname, "../.env.local"));

const MANAGERS: Array<{ key: string; first_name: string; last_name: string; slug: string }> = [
  { key: "Nagy Ors", first_name: "Ors", last_name: "Nagy", slug: "nagy.ors" },
  { key: "Vlad Ciubuca", first_name: "Vlad", last_name: "Ciubuca", slug: "vlad.ciubuca" },
  { key: "Szasz Bela", first_name: "Bela", last_name: "Szasz", slug: "szasz.bela" },
  { key: "Kendi Róbert", first_name: "Róbert", last_name: "Kendi", slug: "kendi.robert" },
  { key: "Andrei", first_name: "Andrei", last_name: "", slug: "andrei" },
  { key: "Papp Alpar", first_name: "Alpar", last_name: "Papp", slug: "papp.alpar" },
  { key: "Zoli", first_name: "Zoli", last_name: "", slug: "zoli" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE env vars");

  const admin = createClient(url, serviceKey);
  const result: Record<string, string> = {};

  for (const m of MANAGERS) {
    const email = `${m.slug}@placeholder.veltol.local`;
    const password = randomBytes(24).toString("base64url");

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser failed for ${m.key}: ${error.message}`);

    const id = data.user!.id;

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        first_name: m.first_name || null,
        last_name: m.last_name || null,
        role: "project_manager",
      })
      .eq("id", id);
    if (updateError) throw new Error(`profile update failed for ${m.key}: ${updateError.message}`);

    result[m.key] = id;
    console.log(`${m.key} -> ${id} (${email})`);
  }

  const fs = await import("fs/promises");
  await fs.writeFile(
    resolve(__dirname, "manager_ids.json"),
    JSON.stringify(result, null, 2),
    "utf-8",
  );
  console.log("Wrote scripts/manager_ids.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
