"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useTranslations } from "next-intl";

interface ConfirmOptions {
  title: string;
  description?: string;
  tone?: "danger" | "default";
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used within a ConfirmProvider");
  return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: "" });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(typeof opts === "string" ? { title: opts } : opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    setOpen(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  const tone = options.tone ?? "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && settle(false)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={
                  tone === "danger"
                    ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-veltol-red/10 text-veltol-red"
                    : "flex size-9 shrink-0 items-center justify-center rounded-full bg-veltol-tint text-veltol-accent"
                }
              >
                <AlertTriangle className="size-[18px]" />
              </div>
              <div className="min-w-0 pt-1">
                <Dialog.Title className="text-[15px] font-semibold text-veltol-fg">
                  {options.title}
                </Dialog.Title>
                {options.description && (
                  <Dialog.Description className="mt-1 text-[13px] text-veltol-fgDim">
                    {options.description}
                  </Dialog.Description>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => settle(false)}>
                {options.cancelLabel ?? t("cancel")}
              </Button>
              <Button
                variant={tone === "danger" ? "destructive" : "default"}
                onClick={() => settle(true)}
                autoFocus
              >
                {options.confirmLabel ?? t("confirm")}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}
