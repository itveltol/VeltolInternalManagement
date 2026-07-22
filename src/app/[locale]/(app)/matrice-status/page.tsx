import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/supabase/session";
import { getMatrixData, getAvailableProjects, getShownMatriceProjectIds } from "./actions";
import { MatriceShell } from "@/features/matrice/components/MatriceShell";
import { PageHeader } from "@/shared/components/layout/PageHeader";

export default async function MatriceStatusPage() {
  const { user } = await getSessionUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("matrice");

  const [allProjects, initialShownIds] = await Promise.all([
    getAvailableProjects(),
    getShownMatriceProjectIds(),
  ]);
  // Nothing is shown by default (portfolio can run into the hundreds of
  // projects) — the user picks a handful to view, persisted server-side.
  const initialData = await getMatrixData(initialShownIds);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrowSegments={[t("eyebrowSection"), t("eyebrowSub")]}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <MatriceShell initialData={initialData} allProjects={allProjects} initialShownIds={initialShownIds} />
    </div>
  );
}
