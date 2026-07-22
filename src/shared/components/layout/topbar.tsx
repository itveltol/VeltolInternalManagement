"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { LanguageSwitcher } from "@/shared/components/language-switcher";
import { InlineSearchBar } from "@/features/search/components/InlineSearchBar";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="relative flex shrink-0 flex-col gap-2 border-b border-border bg-card px-3 py-2 sm:px-6 lg:h-[62px] lg:flex-row lg:items-center lg:py-0">
      <div className="flex items-center gap-2 lg:min-w-0 lg:flex-1">
        {/* Mobile/tablet nav trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-8 w-8 shrink-0 text-veltol-fgMute hover:bg-[#F3F6FC] hover:text-veltol-fg lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Search - desktop, fills available space */}
        <div className="hidden min-w-0 lg:flex lg:flex-1 lg:px-4">
          <InlineSearchBar />
        </div>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="relative h-[38px] w-[38px] text-veltol-fgMute hover:bg-[#F3F6FC] hover:text-veltol-fg"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--v-warning)]" />
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
