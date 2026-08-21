"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Pagination } from "@/shared/components/ui/pagination";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle,
  DataCardBody, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { AddTeamDialog } from "./AddTeamDialog";
import { deleteTeamAction } from "@/app/[locale]/(app)/teams/actions";
import { useTeamsStore } from "../hooks/useTeamsStore";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils/formatDate";
import type { Team } from "../types";
import type { ProfileRef } from "./TeamMemberPicker";

const PAGE_SIZE = 20;

function leadInitials(team: Team): string {
  const f = team.lead?.first_name?.[0] ?? "";
  const l = team.lead?.last_name?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function leadName(team: Team): string {
  return `${team.lead?.first_name ?? ""} ${team.lead?.last_name ?? ""}`.trim() || "—";
}

interface Props {
  teams: Team[];
  canMutate: boolean;
  allProfiles: ProfileRef[];
}

export function TeamsTable({ teams, canMutate, allProfiles }: Props) {
  const t = useTranslations("teams");
  const locale = useLocale();
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const {
    isAddDialogOpen, deletingId,
    openAddDialog, closeAddDialog,
    setDeletingId,
  } = useTeamsStore();

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedTeams = teams.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleDelete(teamId: number) {
    const ok = await confirm({ title: t("confirmDelete"), confirmLabel: t("deleteTeam") });
    if (!ok) return;
    setDeletingId(teamId);
    startTransition(async () => {
      const result = await deleteTeamAction(teamId);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else if (result?.success) toast.success(t(result.success as "teamDeleted"));
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      <TableShell>
        <TableToolbar>
          <div>
            <span className="text-xs font-medium text-veltol-fgMute">
              {t("totalCount", { count: teams.length })}
            </span>
          </div>
          {canMutate && (
            <Button onClick={openAddDialog} variant="outline">
              {t("addTeam")}
            </Button>
          )}
        </TableToolbar>

        <TableDesktopView>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  t("columns.name"), t("columns.lead"), t("columns.members"), t("columns.created"), "",
                ].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                pagedTeams.map((team) => (
                  <tr
                    key={team.id}
                    className="group cursor-pointer transition-colors hover:bg-veltol-hover"
                    onClick={() => router.push(`/${locale}/teams/${team.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-veltol-fg">{team.name}</span>
                    </td>

                    <td className="px-5 py-3.5">
                      {team.lead_id ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="grad-blue text-[9px] font-bold text-white">
                              {leadInitials(team)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[12px] text-veltol-fgDim">
                            {`${team.lead?.first_name ?? ""} ${team.lead?.last_name ?? ""}`.trim() || "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-veltol-fgMute">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[12px] text-veltol-fgDim">
                      {t("memberCount", { count: team.member_count ?? 0 })}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-veltol-fgDim">
                      {formatDate(team.created_at)}
                    </td>

                    <td className="px-5 py-3.5">
                      {canMutate && (
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            title={t("deleteTeam")}
                            disabled={isPending && deletingId === team.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(team.id);
                            }}
                          >
                            {isPending && deletingId === team.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableDesktopView>

        {teams.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
        ) : (
          <DataCardList>
            {pagedTeams.map((team) => (
              <DataCard key={team.id} onClick={() => router.push(`/${locale}/teams/${team.id}`)}>
                <DataCardHeader>
                  <div className="min-w-0">
                    <DataCardTitle>{team.name}</DataCardTitle>
                  </div>
                </DataCardHeader>

                <DataCardBody>
                  <DataCardField label={t("columns.lead")}>
                    {team.lead_id ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="grad-blue text-[9px] font-bold text-white">
                            {leadInitials(team)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{leadName(team)}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </DataCardField>
                  <DataCardField label={t("columns.members")}>
                    {t("memberCount", { count: team.member_count ?? 0 })}
                  </DataCardField>
                  <DataCardField label={t("columns.created")}>{formatDate(team.created_at)}</DataCardField>
                </DataCardBody>

                {canMutate && (
                  <DataCardFooter>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={isPending && deletingId === team.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(team.id);
                      }}
                    >
                      {isPending && deletingId === team.id ? <Loader2 className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
                      {t("deleteTeam")}
                    </Button>
                  </DataCardFooter>
                )}
              </DataCard>
            ))}
          </DataCardList>
        )}

        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          prevLabel={t("pagination.prev")}
          nextLabel={t("pagination.next")}
          pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
        />
      </TableShell>

      <AddTeamDialog
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
        allProfiles={allProfiles}
      />
    </>
  );
}
