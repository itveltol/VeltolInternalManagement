import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { createSupabaseBillingClient } from "@/features/situations/api/supabaseBillingClient";
import * as billingService from "@/features/situations/services/billingService";
import { getAllSituationsWithProjects, getCentralizerRows, getProjectsForPicker } from "./actions";
import { SituationsShell } from "@/features/situations/components/SituationsShell";

export default async function SituationsPage() {
  const { supabase, user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const canMutateBilling = ["admin", "finance"].includes(role ?? "");

  const billingApi = createSupabaseBillingClient(supabase);
  const [rows, situations, projects, billing] = await Promise.all([
    getCentralizerRows(),
    getAllSituationsWithProjects(),
    getProjectsForPicker(),
    billingService.getAllBilling(billingApi),
  ]);
  const t = await getTranslations("situations");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
      </div>

      <SituationsShell
        rows={rows}
        situations={situations}
        projects={projects}
        billing={billing}
        canMutate={canMutate}
        canMutateBilling={canMutateBilling}
      />
    </div>
  );
}
