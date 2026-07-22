import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getProjects, getProjectManagers, getClientRefs } from "./actions";
import { ProjectsShell } from "@/features/projects/components/ProjectsShell";
import { PageHeader } from "@/shared/components/layout/PageHeader";

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
      <PageHeader
        eyebrowSegments={[t("eyebrowSection"), t("eyebrowSub")]}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <ProjectsShell projects={projects} canMutate={canMutate} managers={managers} clientRefs={clientRefs} />
    </div>
  );
}
