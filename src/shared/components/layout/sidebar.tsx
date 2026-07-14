"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavContent } from "@/shared/components/layout/NavContent";
import { cn } from "@/shared/utils/cn";

export function Sidebar({
  displayName,
  initials,
  collapsed = false,
  onToggleCollapsed,
}: {
  displayName?: string | null;
  initials?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      {/* Brand lockup */}
      <div className="flex h-[62px] shrink-0 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-veltol-primary text-[13px] font-bold text-white">
          V
        </div>
        {!collapsed && (
          <div className="min-w-0 truncate">
            <span className="text-[15px] font-semibold text-veltol-fg">Veltol</span>
            <span className="text-[15px] font-semibold text-veltol-accent">.io</span>
          </div>
        )}
      </div>

      <NavContent displayName={displayName} initials={initials} collapsed={collapsed} />

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-border p-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-veltol-fgMute transition-colors hover:bg-veltol-surface/50 hover:text-veltol-fg",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
