import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/core/supabase/server";
import { getMatrixData, getAvailableProjects } from "./actions";
import { MatriceShell } from "@/features/matrice/components/MatriceShell";

export default async function MatriceStatusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("matrice");

  const [allProjects, initialData] = await Promise.all([
    getAvailableProjects(),
    // Load the first 3 projects by default; client will restore from localStorage on mount
    getAvailableProjects().then((projects) =>
      getMatrixData(projects.slice(0, 3).map((p) => p.id)),
    ),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="mono-label text-[10px] text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <MatriceShell initialData={initialData} allProjects={allProjects} />
    </div>
  );
}
