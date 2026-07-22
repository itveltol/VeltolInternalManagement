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
        <Dialog.Popup className="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-panel data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>

          {/* Brand lockup */}
          <div className="flex h-[62px] shrink-0 items-center gap-2.5 border-b border-border px-5">
            <div className="grad-blue flex h-10 w-10 items-center justify-center rounded-[12px] text-[15px] font-bold text-white">
              V
            </div>
            <div className="min-w-0 truncate">
              <div className="truncate text-[15px] font-extrabold text-veltol-fg">Veltol Core</div>
              <div className="truncate text-[12px] font-medium text-veltol-fgMute">Portfolio OS</div>
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
