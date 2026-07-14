import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getVacationRequests, getVacationBalance, getHolidays } from "./actions";
import { getAllUsers } from "@/app/[locale]/(app)/profile/actions";
import { VacationShell } from "@/features/vacation/components/VacationShell";

export default async function VacationPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const isAdmin = role === "admin";
  const [requests, balance, employees, holidays] = await Promise.all([
    getVacationRequests(),
    getVacationBalance(),
    isAdmin ? getAllUsers() : Promise.resolve([]),
    getHolidays(),
  ]);

  const t = await getTranslations("vacation");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <VacationShell
        requests={requests}
        isAdmin={isAdmin}
        currentUserId={user.id}
        balance={balance}
        employees={employees}
        holidays={holidays}
      />
    </div>
  );
}
