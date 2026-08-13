import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { canBroadcast } from "@/core/auth/permissions";
import { AnnouncementsShell } from "@/features/comms/components/AnnouncementsShell";
import {
  getAnnouncements,
  getAnnouncementListMeta,
  getAnnouncementProjectOptions,
  getAnnouncementTeamOptions,
} from "./actions";

export default async function AnnouncementsPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const isBroadcaster = canBroadcast(role);
  const announcements = await getAnnouncements();
  const [meta, projectOptions, teamOptions] = await Promise.all([
    getAnnouncementListMeta(announcements.map((a) => a.id)),
    isBroadcaster ? getAnnouncementProjectOptions() : Promise.resolve([]),
    isBroadcaster ? getAnnouncementTeamOptions() : Promise.resolve([]),
  ]);

  const t = await getTranslations("comms");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("announcements.eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("announcements.title")}
        </h1>
        <p className="mt-1 text-[13px] text-veltol-fgMute">{t("announcements.subtitle")}</p>
      </div>

      <AnnouncementsShell
        announcements={announcements}
        canBroadcast={isBroadcaster}
        isAdmin={role === "admin"}
        currentUserId={user!.id}
        meta={meta}
        projectOptions={projectOptions}
        teamOptions={teamOptions}
      />
    </div>
  );
}
