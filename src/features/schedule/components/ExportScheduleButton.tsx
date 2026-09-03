"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

const EXPORT_REGION_ID = "schedule-export-region";

interface Props {
  weekStart: string;
}

export function ExportScheduleButton({ weekStart }: Props) {
  const t = useTranslations("schedule");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    const region = document.getElementById(EXPORT_REGION_ID);
    if (!region) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(region, {
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `schedule-${weekStart}.png`;
      link.click();
    } catch {
      toast.error(t("export.error"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      <Download data-icon="inline-start" />
      {isExporting ? t("export.generating") : t("export.button")}
    </Button>
  );
}
