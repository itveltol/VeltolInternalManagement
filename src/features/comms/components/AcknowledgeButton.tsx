"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { acknowledgeAction } from "@/app/[locale]/(app)/announcements/actions";

interface Props {
  noteId: number;
  initiallyAcknowledged: boolean;
}

export function AcknowledgeButton({ noteId, initiallyAcknowledged }: Props) {
  const t = useTranslations("comms");
  const [acknowledged, setAcknowledged] = useState(initiallyAcknowledged);
  const [isPending, startTransition] = useTransition();

  if (acknowledged) {
    return (
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--v-success)]">
        <CheckCircle2 className="h-4 w-4" />
        {t("announcements.youAcknowledged")}
      </div>
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await acknowledgeAction(noteId);
      if (result?.success) {
        setAcknowledged(true);
      } else if (result?.error) {
        toast.error(t(result.error as "errorGeneric"));
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {t("announcements.acknowledge")}
    </Button>
  );
}
