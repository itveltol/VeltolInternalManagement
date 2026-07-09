// One-off: import scripts/contracte_import.json (produced by extract_contracte.py)
// as projects, matching/creating clients and resolving manager_id from
// scripts/manager_ids.json. Run with `npx tsx scripts/import_contracte.ts [--dry-run]`.
import { resolve } from "path";
import { readFile } from "fs/promises";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(resolve(__dirname, "../.env.local"));

interface ImportRow {
  row: number;
  name: string;
  client_name: string;
  client_type: "company" | "person";
  contract_number: string | null;
  value_eur: number | null;
  deadline: string | null;
  manager_name: string | null;
  mw_solar: number | null;
  paid_by: string | null;
  notes: string | null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const offsetArg = process.argv.find((a) => a.startsWith("--offset="));
  const offset = offsetArg ? Number(offsetArg.split("=")[1]) : 0;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE env vars");
  const admin = createClient(url, serviceKey);

  const rows: ImportRow[] = JSON.parse(
    await readFile(resolve(__dirname, "contracte_import.json"), "utf-8"),
  );
  const managerIds: Record<string, string> = JSON.parse(
    await readFile(resolve(__dirname, "manager_ids.json"), "utf-8"),
  );

  const sliced = rows.slice(offset);
  const toProcess = limit ? sliced.slice(0, limit) : sliced;

  const clientIdByName = new Map<string, number>();
  const stats = { created: 0, clientsCreated: 0, clientsReused: 0, managerUnresolved: 0, errors: 0 };

  for (const row of toProcess) {
    const nameKey = row.client_name.trim().toLowerCase();
    let clientId = clientIdByName.get(nameKey);

    if (clientId === undefined) {
      const { data: existing, error: findError } = await admin
        .from("clients")
        .select("id, name")
        .ilike("name", row.client_name.trim())
        .limit(1);
      if (findError) throw new Error(`client lookup failed for "${row.client_name}": ${findError.message}`);

      if (existing && existing.length > 0) {
        clientId = existing[0].id as number;
        stats.clientsReused += 1;
      } else if (!dryRun) {
        const { data: created, error: createError } = await admin
          .from("clients")
          .insert({ name: row.client_name.trim(), type: row.client_type })
          .select("id")
          .single();
        if (createError) throw new Error(`client create failed for "${row.client_name}": ${createError.message}`);
        clientId = created.id as number;
        stats.clientsCreated += 1;
      } else {
        stats.clientsCreated += 1;
        clientId = -1; // placeholder id in dry-run
      }
      clientIdByName.set(nameKey, clientId);
    }

    const managerId = row.manager_name ? managerIds[row.manager_name] ?? null : null;
    if (row.manager_name && !managerId) stats.managerUnresolved += 1;

    const payload = {
      name: row.name,
      county: null,
      site_location: null,
      mw_solar: row.mw_solar,
      mw_bess: null,
      project_type: null,
      manager_id: managerId,
      client_id: clientId,
      current_phase: "proposal",
      progress_pct: 0,
      contract_number: row.contract_number,
      contract_date: null,
      deadline: row.deadline,
      value_eur: row.value_eur,
      status: "on_schedule",
      priority: "medium",
      cu_issued: false,
      atr_issued: false,
      notes: row.notes,
      paid_by: row.paid_by,
    };

    if (dryRun) {
      console.log(`[dry-run] row ${row.row}: ${row.name} -> client_id=${clientId} manager_id=${managerId}`);
      stats.created += 1;
      continue;
    }

    const { error: insertError } = await admin.from("projects").insert(payload);
    if (insertError) {
      console.error(`row ${row.row} (${row.name}) FAILED: ${insertError.message}`);
      stats.errors += 1;
      continue;
    }
    stats.created += 1;
  }

  console.log(dryRun ? "\n[DRY RUN] no writes performed" : "\nImport complete");
  console.log(stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
