"use client";

import { Dialog } from "@base-ui/react/dialog";
import { NavContent } from "@/shared/components/layout/NavContent";

export function MobileNavDrawer({
  open,
  onOpenChange,
  displayName,
  initials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName?: string | null;
  initials?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup className="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/[0.07] bg-veltol-deep shadow-2xl data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>

          {/* Brand lockup */}
          <div className="flex h-[62px] shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-bold text-white shadow-v-glow"
              style={{
                background:
                  "linear-gradient(135deg, #0B1E3E 0%, #163D64 25%, #1A5F88 45%, #1E8FA2 70%, #2BC4C8 100%)",
              }}
            >
              V
            </div>
            <div>
              <span className="font-brand text-[15px] text-veltol-fg">Veltol</span>
              <span className="v-text-gradient font-brand text-[15px]">.io</span>
            </div>
          </div>

          <NavContent
            displayName={displayName}
            initials={initials}
            onNavigate={() => onOpenChange(false)}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
