import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getHolidays, getEmailDigestEnabled } from "./actions";
import { HolidaysTable } from "@/features/holidays/components/HolidaysTable";
import { EmailDigestToggle } from "@/features/comms/components/EmailDigestToggle";

export default async function SettingsPage() {
  const { user, role } = await getUserProfileRole();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const isAdmin = role === "admin";
  const [holidays, emailDigestEnabled] = await Promise.all([
    isAdmin ? getHolidays() : Promise.resolve([]),
    getEmailDigestEnabled(),
  ]);
  const t = await getTranslations("settings");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
      </div>

      <EmailDigestToggle initialEnabled={emailDigestEnabled} />

      {isAdmin && <HolidaysTable holidays={holidays} />}
    </div>
  );
}
