import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getAllSituationsWithProjects, getProjectsForPicker } from "./actions";
import { SituationsShell } from "@/features/situations/components/SituationsShell";

export default async function SituationsPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const [situations, projects] = await Promise.all([
    getAllSituationsWithProjects(),
    canMutate ? getProjectsForPicker() : Promise.resolve([]),
  ]);
  const t = await getTranslations("situations");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
      </div>

      <SituationsShell situations={situations} projects={projects} canMutate={canMutate} />
    </div>
  );
}
