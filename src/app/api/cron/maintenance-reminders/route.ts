import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/core/supabase/admin";
import { buildMaintenanceCycles } from "@/features/projects/maintenance/services/maintenanceService";
import type { MaintenanceCheck, MaintenancePeriod } from "@/features/projects/maintenance/types";

const PERIOD_LABEL: Record<MaintenancePeriod, string> = {
  march: "March",
  october: "October",
};

type ProjectRow = { id: number; name: string; manager_id: string | null };
type ManagerRow = { id: string; email: string; first_name: string | null; last_name: string | null };

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, manager_id")
    .contains("contract_type", ["mentenanta"]);
  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }
  const maintenanceProjects = (projects ?? []) as ProjectRow[];
  if (maintenanceProjects.length === 0) {
    return NextResponse.json({ sent: 0, managers: [] });
  }

  const projectIds = maintenanceProjects.map((p) => p.id);
  const { data: checks, error: checksError } = await supabase
    .from("project_maintenance_checks")
    .select("*")
    .in("project_id", projectIds);
  if (checksError) {
    return NextResponse.json({ error: checksError.message }, { status: 500 });
  }

  const checksByProject = new Map<number, MaintenanceCheck[]>();
  for (const check of (checks ?? []) as MaintenanceCheck[]) {
    const list = checksByProject.get(check.project_id) ?? [];
    list.push(check);
    checksByProject.set(check.project_id, list);
  }

  const today = new Date();
  const dueByManager = new Map<string, { projectName: string; year: number; period: MaintenancePeriod }[]>();
  for (const project of maintenanceProjects) {
    if (!project.manager_id) continue;
    const cycles = buildMaintenanceCycles(checksByProject.get(project.id) ?? [], today);
    for (const cycle of cycles) {
      if (cycle.state !== "needsAttention") continue;
      const list = dueByManager.get(project.manager_id) ?? [];
      list.push({ projectName: project.name, year: cycle.year, period: cycle.period });
      dueByManager.set(project.manager_id, list);
    }
  }

  if (dueByManager.size === 0) {
    return NextResponse.json({ sent: 0, managers: [] });
  }

  const { data: managers, error: managersError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", Array.from(dueByManager.keys()));
  if (managersError) {
    return NextResponse.json({ error: managersError.message }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const resend = apiKey ? new Resend(apiKey) : null;

  const emailedManagers: string[] = [];
  for (const manager of (managers ?? []) as ManagerRow[]) {
    const items = dueByManager.get(manager.id) ?? [];
    if (items.length === 0) continue;

    if (resend && fromEmail) {
      const listHtml = items
        .map((item) => `<li>${item.projectName} — ${PERIOD_LABEL[item.period]} ${item.year}</li>`)
        .join("");
      await resend.emails.send({
        from: fromEmail,
        to: manager.email,
        subject: `Maintenance inspections due (${items.length})`,
        html: `<p>The following projects need a maintenance inspection checked off:</p><ul>${listHtml}</ul>`,
      });
    }
    emailedManagers.push(manager.email);
  }

  return NextResponse.json({ sent: emailedManagers.length, managers: emailedManagers });
}
