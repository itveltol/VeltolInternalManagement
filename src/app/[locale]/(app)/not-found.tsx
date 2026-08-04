import { getTranslations } from "next-intl/server";
import { FileQuestion } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function AppNotFound() {
  const t = await getTranslations("boundaries.notFound");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-veltol-surface">
        <FileQuestion className="size-7 text-veltol-fgDim" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-veltol-fg">{t("title")}</h1>
        <p className="text-sm text-veltol-fgDim">{t("description")}</p>
      </div>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        {t("backToDashboard")}
      </Button>
    </div>
  );
}
