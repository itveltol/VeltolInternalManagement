"use client";

import { useTranslations } from "next-intl";
import { VacationTable } from "./VacationTable";
import { VacationBalanceCard } from "./VacationBalanceCard";
import { HolidaysListCard } from "./HolidaysListCard";
import type { VacationRequest, VacationBalance } from "../types";
import type { Profile } from "@/features/profile/types";
import type { Holiday } from "@/features/holidays/types";

interface Props {
  requests: VacationRequest[];
  isAdmin: boolean;
  currentUserId: string;
  balance: VacationBalance | null;
  employees: Profile[];
  holidays: Holiday[];
}

export function VacationShell({ requests, isAdmin, currentUserId, balance, employees, holidays }: Props) {
  const t = useTranslations("vacation");
  const filteredRequests = isAdmin ? requests : requests.filter((r) => r.user_id === currentUserId);
  return (
    <div className="space-y-6">
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
    </div>
  );
}
