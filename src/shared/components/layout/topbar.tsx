"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { LanguageSwitcher } from "@/shared/components/language-switcher";
import { InlineSearchBar } from "@/features/search/components/InlineSearchBar";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header
      className="relative flex shrink-0 flex-col gap-2 border-b border-white/[0.07] px-3 py-2 sm:px-6 lg:h-[62px] lg:flex-row lg:items-center lg:py-0"
      style={{ background: "rgba(6, 15, 26, 0.75)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center gap-2 lg:min-w-0 lg:flex-1">
        {/* Mobile/tablet nav trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-8 w-8 shrink-0 text-veltol-fgMute hover:bg-veltol-surface/50 hover:text-veltol-fg lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Live pill */}
        <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-veltol-green/20 bg-veltol-green/[0.08] px-2.5 py-1 sm:inline-flex">
          <div className="v-live-dot" />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-veltol-green">
            Élő
          </span>
        </div>

        {/* Search - desktop, fills available space */}
        <div className="hidden min-w-0 lg:flex lg:flex-1 lg:px-4">
          <InlineSearchBar />
        </div>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-veltol-fgMute hover:bg-veltol-surface/50 hover:text-veltol-fg"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search - mobile/tablet, second row */}
      <div className="lg:hidden">
        <InlineSearchBar />
      </div>
    </header>
  );
}
