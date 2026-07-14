import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getProjects, getProjectManagers, getClientRefs } from "./actions";
import { ProjectsShell } from "@/features/projects/components/ProjectsShell";

export default async function ProjectsPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const [projects, managers, clientRefs] = await Promise.all([
    getProjects(),
    canMutate ? getProjectManagers() : Promise.resolve([]),
    canMutate ? getClientRefs() : Promise.resolve([]),
  ]);

  const t = await getTranslations("projects");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <ProjectsShell projects={projects} canMutate={canMutate} managers={managers} clientRefs={clientRefs} />
    </div>
  );
}
