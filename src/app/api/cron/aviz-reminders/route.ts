import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/core/supabase/admin";
import { buildAvizReminders } from "@/features/matrice/services/avizReminderService";
import type { Activity, MatrixCell, MatrixProject } from "@/features/matrice/types";

type ProjectRow = { id: number; name: string; project_type: MatrixProject["project_type"]; contract_type: MatrixProject["contract_type"]; progress_pct_manual: boolean; manager_id: string | null };
type ManagerRow = { id: string; email: string; first_name: string | null; last_name: string | null };

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [{ data: activities, error: activitiesError }, { data: projects, error: projectsError }] = await Promise.all([
    supabase.from("activities").select("*").eq("is_aviz", true),
    supabase.from("projects").select("id, name, project_type, contract_type, progress_pct_manual, manager_id"),
  ]);
  if (activitiesError) {
    return NextResponse.json({ error: activitiesError.message }, { status: 500 });
  }
  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  const avizActivities = (activities ?? []) as Activity[];
  const allProjects = (projects ?? []) as ProjectRow[];
  if (avizActivities.length === 0 || allProjects.length === 0) {
    return NextResponse.json({ sent: 0, managers: [] });
  }

  const { data: cells, error: cellsError } = await supabase
    .from("project_activity_status")
    .select("project_id, activity_id, status, note, expires_at")
    .eq("status", "finalizat")
    .not("expires_at", "is", null);
  if (cellsError) {
    return NextResponse.json({ error: cellsError.message }, { status: 500 });
  }

  const today = new Date();
  const reminders = buildAvizReminders(avizActivities, (cells ?? []) as MatrixCell[], allProjects, today);
  if (reminders.length === 0) {
    return NextResponse.json({ sent: 0, managers: [] });
  }

  const managerByProjectId = new Map(allProjects.map((p) => [p.id, p.manager_id]));
  const dueByManager = new Map<string, { projectName: string; activityName: string; expiresAt: string }[]>();
  for (const reminder of reminders) {
    const managerId = managerByProjectId.get(reminder.projectId);
    if (!managerId) continue;
    const list = dueByManager.get(managerId) ?? [];
    list.push({ projectName: reminder.projectName, activityName: reminder.activityName, expiresAt: reminder.expiresAt });
    dueByManager.set(managerId, list);
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
        .map((item) => `<li>${item.projectName} — ${item.activityName} (expires ${item.expiresAt})</li>`)
        .join("");
      await resend.emails.send({
        from: fromEmail,
        to: manager.email,
        subject: `Aviz renewals due (${items.length})`,
        html: `<p>The following permits/notices are approaching or past their expiry date:</p><ul>${listHtml}</ul>`,
      });
    }
    emailedManagers.push(manager.email);
  }

  return NextResponse.json({ sent: emailedManagers.length, managers: emailedManagers });
}
