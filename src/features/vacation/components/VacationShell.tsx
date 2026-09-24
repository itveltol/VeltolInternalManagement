"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { VacationTable } from "./VacationTable";
import { VacationBalanceCard } from "./VacationBalanceCard";
import { HolidaysListCard } from "./HolidaysListCard";
import { VacationOverviewTable } from "./VacationOverviewTable";
import type { VacationRequest, VacationBalance, VacationOverviewRow } from "../types";
import type { Profile } from "@/features/profile/types";
import type { Holiday } from "@/features/holidays/types";

export type VacationTab = "requests" | "overview";

interface Props {
  requests: VacationRequest[];
  isAdmin: boolean;
  currentUserId: string;
  balance: VacationBalance | null;
  employees: Profile[];
  holidays: Holiday[];
  /** Admin-only balance overview; null for everyone else. */
  overview: { year: number; rows: VacationOverviewRow[] } | null;
  initialTab: VacationTab;
}

export function VacationShell({
  requests,
  isAdmin,
  currentUserId,
  balance,
  employees,
  holidays,
  overview,
  initialTab,
}: Props) {
  const t = useTranslations("vacation");
  const [tab, setTab] = useState<VacationTab>(overview ? initialTab : "requests");
  const filteredRequests = isAdmin ? requests : requests.filter((r) => r.user_id === currentUserId);

  const tabs: { id: VacationTab; label: string }[] = [
    { id: "requests", label: t("tabRequests") },
    { id: "overview", label: t("tabOverview") },
  ];

  return (
    <div className="space-y-6">
      {overview && (
        <div className="flex flex-wrap gap-1 border-b border-border">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                tab === id
                  ? "rounded-t-md border border-b-0 border-veltol-accent/25 bg-veltol-accent/10 px-4 py-2 text-[13px] font-semibold text-veltol-accent"
                  : "px-4 py-2 text-[13px] text-veltol-fgMute transition-colors hover:text-veltol-fgDim"
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "overview" && overview ? (
        <VacationOverviewTable
          rows={overview.rows}
          year={overview.year}
          currentUserId={currentUserId}
          employees={employees}
          holidays={holidays}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <VacationBalanceCard balance={balance} label={t("yourBalance")} />
            <HolidaysListCard holidays={holidays} />
          </div>
          <VacationTable
            requests={filteredRequests}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            balance={balance}
            employees={employees}
            holidays={holidays}
          />
        </>
      )}
    </div>
  );
}
