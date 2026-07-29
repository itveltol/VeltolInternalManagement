import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getSubcontractors } from "./actions";
import { SubcontractorsShell } from "@/features/subcontractors/components/SubcontractorsShell";

export default async function SubcontractorsPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const subcontractors = await getSubcontractors();
  const t = await getTranslations("subcontractors");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
      </div>

      <SubcontractorsShell subcontractors={subcontractors} canMutate={canMutate} />
    </div>
  );
}
