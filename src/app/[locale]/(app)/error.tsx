"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

// unstable_retry is a Next 16.2+ error.tsx prop (per this project's Next docs)
// that re-fetches and re-renders the segment, preferred over legacy reset().
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslations("boundaries.error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-veltol-red/10">
        <AlertTriangle className="size-7 text-veltol-red" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-veltol-fg">{t("title")}</h1>
        <p className="text-sm text-veltol-fgDim">{t("description")}</p>
      </div>
      <Button onClick={() => unstable_retry()}>{t("retry")}</Button>
    </div>
  );
}
