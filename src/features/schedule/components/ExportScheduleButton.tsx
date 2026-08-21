"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ScheduleExportCapture } from "./ScheduleExportCapture";
import type { TeamScheduleRow } from "../types";

interface Props {
  rows: TeamScheduleRow[];
  weekStart: string;
}

export function ExportScheduleButton({ rows, weekStart }: Props) {
  const t = useTranslations("schedule");
  const captureRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!captureRef.current) return;
    setIsExporting(true);
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(captureRef.current, {
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
    <>
      <Button variant="outline" onClick={handleExport} disabled={isExporting}>
        <Download data-icon="inline-start" />
        {isExporting ? t("export.generating") : t("export.button")}
      </Button>
      <ScheduleExportCapture ref={captureRef} rows={rows} weekStart={weekStart} />
    </>
  );
}
