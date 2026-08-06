import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getSuppliers } from "./actions";
import { SuppliersShell } from "@/features/suppliers/components/SuppliersShell";

export default async function SuppliersPage() {
  const { user, role } = await getUserProfileRole();

  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const canMutate = ["admin", "project_manager"].includes(role ?? "");
  const suppliers = await getSuppliers();
  const t = await getTranslations("suppliers");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
      </div>

      <SuppliersShell suppliers={suppliers} canMutate={canMutate} />
    </div>
  );
}
