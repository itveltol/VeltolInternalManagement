import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getHolidays } from "./actions";
import { HolidaysTable } from "@/features/holidays/components/HolidaysTable";

export default async function SettingsPage() {
  const { user, role } = await getUserProfileRole();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (role !== "admin") {
    redirect(`/${locale}/dashboard`);
  }

  const holidays = await getHolidays();
  const t = await getTranslations("settings");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <HolidaysTable holidays={holidays} />
    </div>
  );
}
