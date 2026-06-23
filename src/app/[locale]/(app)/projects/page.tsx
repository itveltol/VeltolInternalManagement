import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjects, getProjectManagers } from "./actions";
import { ProjectsTable } from "./ProjectsTable";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const canMutate = ["admin", "project_manager"].includes(profile?.role ?? "");

  const [projects, managers] = await Promise.all([
    getProjects(),
    canMutate ? getProjectManagers() : Promise.resolve([]),
  ]);

  const t = await getTranslations("projects");

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <div className="mono-label text-[10px] text-veltol-fgMute">
          {t("eyebrow")}
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <ProjectsTable
        projects={projects}
        canMutate={canMutate}
        managers={managers}
      />
    </div>
  );
}
