"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Pagination } from "@/shared/components/ui/pagination";
import { AddTeamDialog } from "./AddTeamDialog";
import { EditTeamDialog } from "./EditTeamDialog";
import { deleteTeamAction } from "@/app/[locale]/(app)/teams/actions";
import { useTeamsStore } from "../hooks/useTeamsStore";
import type { Team } from "../types";
import type { ProfileRef } from "./TeamMemberPicker";

const PAGE_SIZE = 20;

function leadInitials(team: Team): string {
  const f = team.lead?.first_name?.[0] ?? "";
  const l = team.lead?.last_name?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

interface Props {
  teams: Team[];
  canMutate: boolean;
  allProfiles: ProfileRef[];
}

export function TeamsTable({ teams, canMutate, allProfiles }: Props) {
  const t = useTranslations("teams");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    isAddDialogOpen, editingTeam, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId,
  } = useTeamsStore();

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedTeams = teams.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleDelete(teamId: number) {
    if (!confirm(t("confirmDelete"))) return;
    setDeletingId(teamId);
    startTransition(async () => {
      await deleteTeamAction(teamId);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
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
        </div>

        <div className="overflow-x-auto">
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
                  <tr key={team.id} className="group transition-colors hover:bg-veltol-surface/50">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/teams/${team.id}`}
                        className="font-medium text-veltol-fg hover:text-veltol-accent"
                      >
                        {team.name}
                      </Link>
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
                      {new Date(team.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5">
                      {canMutate && (
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            title={t("editTeam")}
                            onClick={() => openEditDialog(team)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            title={t("deleteTeam")}
                            disabled={isPending && deletingId === team.id}
                            onClick={() => handleDelete(team.id)}
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
        </div>

        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          prevLabel={t("pagination.prev")}
          nextLabel={t("pagination.next")}
          pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
        />
      </div>

      <AddTeamDialog
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
        allProfiles={allProfiles}
      />

      {editingTeam && (
        <EditTeamDialog
          team={editingTeam}
          open={!!editingTeam}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
          allProfiles={allProfiles}
        />
      )}
    </>
  );
}
