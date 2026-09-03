import { getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardBody, DataCardField,
} from "@/shared/components/ui/data-card";
import { memberInitials } from "../utils/memberInitials";
import type { WorkerHoursSummary } from "../types";

interface Props {
  rows: WorkerHoursSummary[];
}

export async function WorkerHoursSummaryTable({ rows }: Props) {
  const t = await getTranslations("schedule");

  const columns = [
    t("hoursSummary.columns.person"),
    t("hoursSummary.columns.normalDays"),
    t("hoursSummary.columns.delegationDays"),
    t("hoursSummary.columns.baseHours"),
    t("hoursSummary.columns.plusHours"),
    t("hoursSummary.columns.totalHours"),
  ];

  return (
    <TableShell>
      <TableToolbar>
        <div>
          <div className="text-[11px] font-medium text-veltol-fgMute">{t("hoursSummary.eyebrow")}</div>
          <h2 className="mt-0.5 text-lg font-semibold text-veltol-fg">{t("hoursSummary.title")}</h2>
        </div>
      </TableToolbar>

      <TableDesktopView>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-[11px] font-medium text-veltol-fgMute ${i === 0 ? "text-left" : "text-right"}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                  {t("hoursSummary.empty")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.assignee.id} className="align-top transition-colors hover:bg-veltol-surface/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="grad-blue text-[9px] font-bold text-white">
                          {memberInitials(row.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-veltol-fg">{row.assignee.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-veltol-fgDim">{row.normalDays}</td>
                  <td className="px-5 py-3.5 text-right text-veltol-fgDim">{row.delegationDays}</td>
                  <td className="px-5 py-3.5 text-right text-veltol-fgDim">{row.baseHours}</td>
                  <td className="px-5 py-3.5 text-right text-veltol-fgDim">{row.plusHours}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-veltol-fg">{row.totalHours}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableDesktopView>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("hoursSummary.empty")}</p>
      ) : (
        <DataCardList>
          {rows.map((row) => (
            <DataCard key={row.assignee.id}>
              <DataCardHeader>
                <DataCardTitle>{row.assignee.name}</DataCardTitle>
              </DataCardHeader>
              <DataCardBody>
                <DataCardField label={t("hoursSummary.columns.normalDays")}>{row.normalDays}</DataCardField>
                <DataCardField label={t("hoursSummary.columns.delegationDays")}>{row.delegationDays}</DataCardField>
                <DataCardField label={t("hoursSummary.columns.baseHours")}>{row.baseHours}</DataCardField>
                <DataCardField label={t("hoursSummary.columns.plusHours")}>{row.plusHours}</DataCardField>
                <DataCardField label={t("hoursSummary.columns.totalHours")}>{row.totalHours}</DataCardField>
              </DataCardBody>
            </DataCard>
          ))}
        </DataCardList>
      )}
    </TableShell>
  );
}
