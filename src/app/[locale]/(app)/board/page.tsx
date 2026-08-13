import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { createSupabaseCommsClient } from "@/features/comms/api/supabaseCommsClient";
import { BoardShell } from "@/features/comms/components/BoardShell";
import { MetricsStrip } from "@/features/comms/components/MetricsStrip";
import { getNotes, getNotifications, getCommsMetrics, getBoardProjectOptions, getBoardTeamOptions } from "./actions";

export default async function BoardPage() {
  const { supabase, user } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const api = createSupabaseCommsClient(supabase);
  const [notes, notifications, personalPinnedIds, metrics, projectOptions, teamOptions] = await Promise.all([
    getNotes({}),
    getNotifications(),
    api.getPersonalPinNoteIds(user!.id),
    getCommsMetrics(),
    getBoardProjectOptions(),
    getBoardTeamOptions(),
  ]);

  const t = await getTranslations("comms");
  const now = new Date().toISOString();

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-[13px] text-veltol-fgMute">{t("subtitle")}</p>
      </div>

      {metrics && <MetricsStrip metrics={metrics} />}

      <BoardShell
        initialNotes={notes}
        initialNotifications={notifications}
        personalPinnedIds={personalPinnedIds}
        now={now}
        projectOptions={projectOptions}
        teamOptions={teamOptions}
      />
    </div>
  );
}
