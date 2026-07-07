"use client";

import { NavContent } from "@/shared/components/layout/NavContent";

export function Sidebar({
  displayName,
  initials,
}: {
  displayName?: string | null;
  initials?: string;
}) {
  return (
    <aside
      className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.07] lg:flex"
      style={{ background: "rgba(6, 15, 26, 0.75)", backdropFilter: "blur(20px)" }}
    >
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

      <NavContent displayName={displayName} initials={initials} />
    </aside>
  );
}
