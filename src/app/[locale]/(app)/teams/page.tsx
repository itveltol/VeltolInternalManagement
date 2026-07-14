import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getTeams, getProfileRefs } from "./actions";
import { TeamsShell } from "@/features/teams/components/TeamsShell";

export default async function TeamsPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const [teams, allProfiles] = await Promise.all([
    getTeams(),
    canMutate ? getProfileRefs() : Promise.resolve([]),
  ]);
  const t = await getTranslations("teams");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <TeamsShell teams={teams} canMutate={canMutate} allProfiles={allProfiles} />
    </div>
  );
}
