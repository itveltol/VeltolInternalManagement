import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/core/supabase/admin";
import { buildMaintenanceCycles } from "@/features/projects/maintenance/services/maintenanceService";
import type { MaintenanceCheck, MaintenancePeriod } from "@/features/projects/maintenance/types";

type ProjectRow = { id: number; name: string; manager_id: string | null };
type ManagerRow = { id: string; email: string; first_name: string | null; last_name: string | null; locale: string };

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("maintenance-reminders: CRON_SECRET is not set — refusing to run.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
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
    return NextResponse.json({ sent: 0, notified: 0, managers: [] });
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
  const dueByManager = new Map<string, { projectId: number; projectName: string; year: number; period: MaintenancePeriod }[]>();
  for (const project of maintenanceProjects) {
    if (!project.manager_id) continue;
    const cycles = buildMaintenanceCycles(checksByProject.get(project.id) ?? [], today);
    for (const cycle of cycles) {
      if (cycle.state !== "needsAttention") continue;
      const list = dueByManager.get(project.manager_id) ?? [];
      list.push({ projectId: project.id, projectName: project.name, year: cycle.year, period: cycle.period });
      dueByManager.set(project.manager_id, list);
    }
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

  const { data: admins, error: adminsError } = await supabase.from("profiles").select("id, locale").eq("role", "admin");
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

    const t = await getTranslations({ locale: manager.locale, namespace: "cronEmails.maintenance" });
    const periodLabel = (period: MaintenancePeriod) => (period === "march" ? t("periodMarch") : t("periodOctober"));

    for (const item of items) {
      await supabase.from("notifications").insert({
        profile_id: manager.id,
        type: "maintenance_due",
        project_id: item.projectId,
        payload: { projectName: item.projectName, snippet: `${periodLabel(item.period)} ${item.year}` },
        href: `/projects/${item.projectId}?tab=maintenance`,
      });
      notified += 1;
    }

    if (resend && fromEmail) {
      const listHtml = items
        .map((item) => `<li>${t("item", { project: item.projectName, period: periodLabel(item.period), year: item.year })}</li>`)
        .join("");
      const { error: sendError } = await resend.emails.send({
        from: fromEmail,
        to: manager.email,
        subject: t("subject", { count: items.length }),
        html: `<p>${t("intro")}</p><ul>${listHtml}</ul><p>${t("footer")}</p>`,
      });
      if (!sendError) emailedManagers.push(manager.email);
    }
  }

  for (const admin of (admins ?? []) as { id: string; locale: string }[]) {
    const tAdmin = await getTranslations({ locale: admin.locale, namespace: "cronEmails.maintenance" });
    const adminPeriodLabel = (period: MaintenancePeriod) => (period === "march" ? tAdmin("periodMarch") : tAdmin("periodOctober"));

    for (const [managerId, items] of dueByManager) {
      if (managerId === admin.id) continue;
      for (const item of items) {
        await supabase.from("notifications").insert({
          profile_id: admin.id,
          type: "maintenance_due",
          project_id: item.projectId,
          payload: { projectName: item.projectName, snippet: `${adminPeriodLabel(item.period)} ${item.year}` },
          href: `/projects/${item.projectId}?tab=maintenance`,
        });
        notified += 1;
      }
    }
  }

  return NextResponse.json({ sent: emailedManagers.length, notified, managers: emailedManagers });
}
