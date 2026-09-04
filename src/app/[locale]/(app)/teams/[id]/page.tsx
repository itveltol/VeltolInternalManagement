import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getTeam, getTeamMembers, getTeamWorkers, getAllTeamWorkers } from "./actions";
import { getProfileRefs, getTeams } from "../actions";
import { TeamDetailShell } from "@/features/teams/components/TeamDetailShell";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const teamId = Number(id);
  if (isNaN(teamId)) notFound();

  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");

  const [team, members, workers, allWorkers, allProfiles, allTeams] = await Promise.all([
    getTeam(teamId),
    getTeamMembers(teamId),
    getTeamWorkers(teamId),
    getAllTeamWorkers(),
    getProfileRefs(),
    getTeams(),
  ]);

  if (!team) notFound();

  const t = await getTranslations("teams");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {team.name}
        </h1>
        {team.description && (
          <p className="mt-1 text-sm text-veltol-fgDim">{team.description}</p>
        )}
      </div>

      <TeamDetailShell
        team={team}
        members={members}
        workers={workers}
        allWorkers={allWorkers}
        allProfiles={allProfiles}
        allTeams={allTeams.map((t) => ({ id: t.id, name: t.name }))}
        canMutate={canMutate}
      />
    </div>
  );
}
