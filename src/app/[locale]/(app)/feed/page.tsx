import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { FeedShell } from "@/features/comms/components/FeedShell";
import { getGlobalFeedPage, getFeedProjectOptions, getFeedActorOptions } from "./actions";

export default async function FeedPage() {
  const { user } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const [feedPage, projectOptions, actorOptions] = await Promise.all([
    getGlobalFeedPage({}, 0),
    getFeedProjectOptions(),
    getFeedActorOptions(),
  ]);

  const t = await getTranslations("comms");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("feed.eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">{t("feed.title")}</h1>
        <p className="mt-1 text-[13px] text-veltol-fgMute">{t("feed.subtitle")}</p>
      </div>

      <FeedShell
        initialItems={feedPage.items}
        initialHasMore={feedPage.hasMore}
        projectOptions={projectOptions}
        actorOptions={actorOptions}
      />
    </div>
  );
}
