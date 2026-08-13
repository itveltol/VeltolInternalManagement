import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getProjectsPage, getProjectManagers, getClientRefs, getSubcontractorRefs, getExchangeRate } from "./actions";
import { ProjectsShell } from "@/features/projects/components/ProjectsShell";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export default async function ProjectsPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const [{ projects, totalCount }, managers, clientRefs, subcontractorRefs, exchangeRate] = await Promise.all([
    getProjectsPage({ page: 1 }),
    canMutate ? getProjectManagers() : Promise.resolve([]),
    canMutate ? getClientRefs() : Promise.resolve([]),
    canMutate ? getSubcontractorRefs() : Promise.resolve([]),
    getExchangeRate(),
  ]);

  const t = await getTranslations("projects");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrowSegments={[t("eyebrowSection"), t("eyebrowSub")]}
        title={t("title")}
      />

      <ProjectsShell
        initialProjects={projects}
        initialTotalCount={totalCount}
        canMutate={canMutate}
        managers={managers}
        clientRefs={clientRefs}
        subcontractorRefs={subcontractorRefs}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
