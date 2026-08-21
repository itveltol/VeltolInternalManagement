import { getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardBody, DataCardField,
} from "@/shared/components/ui/data-card";
import { memberInitials } from "../utils/memberInitials";
import type { TeamScheduleRow } from "../types";

interface Props {
  rows: TeamScheduleRow[];
}

export async function TeamRosterTable({ rows }: Props) {
  const t = await getTranslations("schedule");

  return (
    <TableShell>
      <TableToolbar>
        <div>
          <div className="text-[11px] font-medium text-veltol-fgMute">{t("roster.eyebrow")}</div>
          <h2 className="mt-0.5 text-lg font-semibold text-veltol-fg">{t("roster.title")}</h2>
        </div>
      </TableToolbar>

      <TableDesktopView>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {[t("columns.team"), t("roster.members")].map((col, i) => (
                <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                  {t("emptyState")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.team_id} className="align-top transition-colors hover:bg-veltol-surface/50">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-veltol-fg">{row.team_name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {row.members.length === 0 ? (
                      <span className="text-[12px] text-veltol-fgMute">{t("roster.emptyMembers")}</span>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {row.members.map((member) => (
                          <div key={member.id} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarFallback className="grad-blue text-[9px] font-bold text-white">
                                {memberInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[12px] text-veltol-fgDim">{member.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableDesktopView>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
      ) : (
        <DataCardList>
          {rows.map((row) => (
            <DataCard key={row.team_id}>
              <DataCardHeader>
                <DataCardTitle>{row.team_name}</DataCardTitle>
              </DataCardHeader>
              <DataCardBody>
                <DataCardField label={t("roster.members")}>
                  {row.members.length === 0 ? (
                    t("roster.emptyMembers")
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {row.members.map((member) => (
                        <div key={member.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="grad-blue text-[9px] font-bold text-white">
                              {memberInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </DataCardField>
              </DataCardBody>
            </DataCard>
          ))}
        </DataCardList>
      )}
    </TableShell>
  );
}
