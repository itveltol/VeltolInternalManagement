import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/core/supabase/server";
import { getVacationRequests } from "./actions";
import { VacationShell } from "@/features/vacation/components/VacationShell";

export default async function VacationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const requests = await getVacationRequests();

  const t = await getTranslations("vacation");

  return (
    <div className="space-y-8">
      <div>
        <div className="mono-label text-[10px] text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-veltol-fgDim">{t("subtitle")}</p>
      </div>

      <VacationShell requests={requests} isAdmin={isAdmin} currentUserId={user.id} />
    </div>
  );
}
