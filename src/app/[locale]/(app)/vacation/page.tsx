import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getVacationRequests, getVacationBalance, getHolidays, getVacationOverview } from "./actions";
import { getAllUsers } from "@/app/[locale]/(app)/profile/actions";
import { VacationShell } from "@/features/vacation/components/VacationShell";

interface Props {
  searchParams: Promise<{ tab?: string; year?: string }>;
}

export default async function VacationPage({ searchParams }: Props) {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const isAdmin = role === "admin";
  const { tab, year: yearParam } = await searchParams;
  const parsedYear = Number(yearParam);
  const overviewYear =
    Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : new Date().getFullYear();

  const [requests, balance, employees, holidays, overviewRows] = await Promise.all([
    getVacationRequests(),
    getVacationBalance(),
    isAdmin ? getAllUsers() : Promise.resolve([]),
    getHolidays(),
    isAdmin ? getVacationOverview(overviewYear) : Promise.resolve(null),
  ]);

  const t = await getTranslations("vacation");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
      </div>

      <VacationShell
        requests={requests}
        isAdmin={isAdmin}
        currentUserId={user.id}
        balance={balance}
        employees={employees}
        holidays={holidays}
        overview={overviewRows ? { year: overviewYear, rows: overviewRows } : null}
        initialTab={tab === "overview" ? "overview" : "requests"}
      />
    </div>
  );
}
