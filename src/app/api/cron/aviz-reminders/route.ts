import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/core/supabase/admin";
import { buildAvizReminders } from "@/features/matrice/services/avizReminderService";
import type { Activity, MatrixCell, MatrixProject } from "@/features/matrice/types";

type ProjectRow = { id: number; name: string; project_type: MatrixProject["project_type"]; contract_type: MatrixProject["contract_type"]; manager_id: string | null };
type ManagerRow = { id: string; email: string; first_name: string | null; last_name: string | null; locale: string };

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("aviz-reminders: CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [{ data: activities, error: activitiesError }, { data: projects, error: projectsError }] = await Promise.all([
    supabase.from("activities").select("*").eq("is_aviz", true),
    supabase.from("projects").select("id, name, project_type, contract_type, manager_id"),
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
    return NextResponse.json({ sent: 0, notified: 0, managers: [] });
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
    return NextResponse.json({ sent: 0, notified: 0, managers: [] });
  }

  const projectById = new Map(allProjects.map((p) => [p.id, p]));
  const dueByManager = new Map<string, { projectId: number; projectName: string; activityName: string; expiresAt: string }[]>();
  for (const reminder of reminders) {
    const project = projectById.get(reminder.projectId);
    const managerId = project?.manager_id;
    if (!managerId) continue;
    const list = dueByManager.get(managerId) ?? [];
    list.push({
      projectId: reminder.projectId,
      projectName: reminder.projectName,
      activityName: reminder.activityName,
      expiresAt: reminder.expiresAt,
    });
    dueByManager.set(managerId, list);
  }

  if (dueByManager.size === 0) {
    return NextResponse.json({ sent: 0, notified: 0, managers: [] });
  }

  const { data: managers, error: managersError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, locale")
    .in("id", Array.from(dueByManager.keys()));
  if (managersError) {
    return NextResponse.json({ error: managersError.message }, { status: 500 });
  }

  // Admins get the bell notification too (not the email), so the bell is
  // the single inbox even for people who aren't the project's manager.
  const { data: admins, error: adminsError } = await supabase.from("profiles").select("id").eq("role", "admin");
  if (adminsError) {
    return NextResponse.json({ error: adminsError.message }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const resend = apiKey ? new Resend(apiKey) : null;

  const emailedManagers: string[] = [];
  let notified = 0;

  for (const manager of (managers ?? []) as ManagerRow[]) {
    const items = dueByManager.get(manager.id) ?? [];
    if (items.length === 0) continue;

    const t = await getTranslations({ locale: manager.locale, namespace: "cronEmails.aviz" });

    for (const item of items) {
      await supabase.from("notifications").insert({
        profile_id: manager.id,
        type: "aviz_expiring",
        project_id: item.projectId,
        payload: { projectName: item.projectName, snippet: item.activityName },
        href: `/matrice-status?project=${item.projectId}`,
      });
      notified += 1;

      // Teams outbound (announcement + aviz_expiring only, per module rules)
      // — fired after the notification write, never blocking or rolling
      // back the reminder itself on failure.
      await postAvizExpiringToTeams(item.projectName, item.activityName, item.expiresAt).catch((e) => {
        console.error("aviz-reminders: Teams webhook failed", e);
      });
    }

    if (resend && fromEmail) {
      const listHtml = items.map((item) => `<li>${t("item", { project: item.projectName, activity: item.activityName, date: item.expiresAt })}</li>`).join("");
      const { error: sendError } = await resend.emails.send({
        from: fromEmail,
        to: manager.email,
        subject: t("subject", { count: items.length }),
        html: `<p>${t("intro")}</p><ul>${listHtml}</ul><p>${t("footer")}</p>`,
      });
      if (!sendError) emailedManagers.push(manager.email);
    }
  }

  for (const admin of admins ?? []) {
    for (const [managerId, items] of dueByManager) {
      if (managerId === admin.id) continue; // already notified above as the manager
      for (const item of items) {
        await supabase.from("notifications").insert({
          profile_id: admin.id,
          type: "aviz_expiring",
          project_id: item.projectId,
          payload: { projectName: item.projectName, snippet: item.activityName },
          href: `/matrice-status?project=${item.projectId}`,
        });
        notified += 1;
      }
    }
  }

  return NextResponse.json({ sent: emailedManagers.length, notified, managers: emailedManagers });
}

async function postAvizExpiringToTeams(projectName: string, activityName: string, expiresAt: string): Promise<void> {
  const { postAvizExpiringCard } = await import("@/features/comms/services/outbound/teams");
  await postAvizExpiringCard({ projectName, activityName, expiresAt });
}
