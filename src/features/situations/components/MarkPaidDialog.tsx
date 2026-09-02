"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { markSituationPaidAction } from "@/app/[locale]/(app)/situations/actions";

interface Props {
  situationId: number;
  projectId: number;
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
}

export function MarkPaidDialog({ situationId, projectId, open, onClose, onPaid }: Props) {
  const t = useTranslations("situations");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await markSituationPaidAction(situationId, projectId);
      if (result?.error) toast.error(t(result.error as "errorNotAllowed" | "errorGeneric"));
      else onPaid();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("markPaidConfirmTitle")}
          </Dialog.Title>
          <p className="mt-3 text-sm text-veltol-fgDim">
            {t("markPaidConfirmBody")}
          </p>

          <div className="flex justify-end gap-3 pt-6">
            <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
            <Button type="button" disabled={isPending} onClick={handleConfirm}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {t("markPaidConfirmButton")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
