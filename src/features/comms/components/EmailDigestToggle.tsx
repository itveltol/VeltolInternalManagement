"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setEmailDigestEnabledAction } from "@/app/[locale]/(app)/settings/actions";
import { cn } from "@/shared/utils/cn";

interface Props {
  initialEnabled: boolean;
}

export function EmailDigestToggle({ initialEnabled }: Props) {
  const t = useTranslations("settings");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await setEmailDigestEnabledAction(next);
      if (result?.error) {
        setEnabled(!next);
        toast.error(t(result.error as "errorGeneric"));
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-card border border-border bg-card p-4 shadow-card">
      <div>
        <div className="text-[14px] font-semibold text-veltol-fg">{t("emailDigestTitle")}</div>
        <p className="mt-0.5 text-[13px] text-veltol-fgMute">{t("emailDigestDescription")}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t("emailDigestTitle")}
        disabled={isPending}
        onClick={handleToggle}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60",
          enabled ? "bg-veltol-primary" : "bg-veltol-surface",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
