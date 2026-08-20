import { getTranslations, getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserProfileRole } from "@/core/supabase/session";
import { getCatalog } from "./actions";
import { MatriceCatalogEditor } from "@/features/matriceAdmin/components/MatriceCatalogEditor";

export default async function MatriceCatalogPage() {
  const { user, role } = await getUserProfileRole();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (role !== "admin") {
    redirect(`/${locale}/settings`);
  }

  const catalog = await getCatalog();
  const t = await getTranslations("matriceCatalog");

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-medium text-veltol-fgMute">{t("eyebrow")}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-veltol-fg">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-veltol-fgMute">{t("description")}</p>
      </div>

      <MatriceCatalogEditor initialCatalog={catalog} />
    </div>
  );
}
