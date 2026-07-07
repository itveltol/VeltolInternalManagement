"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/shared/components/layout/sidebar";
import { Topbar } from "@/shared/components/layout/topbar";
import { MobileNavDrawer } from "@/shared/components/layout/MobileNavDrawer";

export function AppShellClient({
  displayName,
  initials,
  children,
}: {
  displayName?: string | null;
  initials?: string;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setNavOpen(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-veltol-void">
      <Sidebar displayName={displayName} initials={initials} />
      <MobileNavDrawer
        open={navOpen}
        onOpenChange={setNavOpen}
        displayName={displayName}
        initials={initials}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
