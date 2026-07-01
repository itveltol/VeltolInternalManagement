"use client";

import { Bell } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { LanguageSwitcher } from "@/shared/components/language-switcher";
import { InlineSearchBar } from "@/features/search/components/InlineSearchBar";

export function Topbar() {
  return (
    <header
      className="relative flex h-[62px] shrink-0 items-center border-b border-white/[0.07] px-6"
      style={{ background: "rgba(6, 15, 26, 0.75)", backdropFilter: "blur(20px)" }}
    >
      {/* Live pill */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-veltol-green/20 bg-veltol-green/[0.08] px-2.5 py-1">
        <div className="v-live-dot" />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-veltol-green">
          Élő
        </span>
      </div>

      {/* Centered search */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <InlineSearchBar />
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-veltol-fgMute hover:bg-veltol-surface/50 hover:text-veltol-fg"
        >
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
