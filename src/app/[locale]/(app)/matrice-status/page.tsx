import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/supabase/session";
import { getMatrixData, getAvailableProjects } from "./actions";
import { MatriceShell } from "@/features/matrice/components/MatriceShell";

export default async function MatriceStatusPage() {
  const { user } = await getSessionUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("matrice");

  const allProjects = await getAvailableProjects();
  // Load the first 3 projects by default; client will restore from localStorage on mount
  const initialData = await getMatrixData(allProjects.slice(0, 3).map((p) => p.id));

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <MatriceShell initialData={initialData} allProjects={allProjects} />
    </div>
  );
}
