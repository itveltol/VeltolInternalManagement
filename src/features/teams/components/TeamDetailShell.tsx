"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle,
  DataCardBadgeSlot, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { TeamMemberPicker } from "./TeamMemberPicker";
import { EditTeamDialog } from "./EditTeamDialog";
import { addTeamMemberAction, removeTeamMemberAction } from "@/app/[locale]/(app)/teams/[id]/actions";
import { deleteTeamAction } from "@/app/[locale]/(app)/teams/actions";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import type { Team, TeamMember } from "../types";
import type { ProfileRef } from "./TeamMemberPicker";

interface Props {
  team: Team;
  members: TeamMember[];
  allProfiles: ProfileRef[];
  canMutate: boolean;
}

function memberInitials(m: TeamMember): string {
  const f = m.profile?.first_name?.[0] ?? "";
  const l = m.profile?.last_name?.[0] ?? "";
  if (f || l) return (f + l).toUpperCase();
  return (m.profile?.email?.[0] ?? "?").toUpperCase();
}

export function TeamDetailShell({ team, members, allProfiles, canMutate }: Props) {
  const t = useTranslations("teams");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [isEditOpen, setEditOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const memberIds = members.map((m) => m.user_id);
  const availableProfiles = allProfiles.filter((p) => !memberIds.includes(p.id));

  function handleAdd(ids: string[]) {
    const newIds = ids.filter((id) => !memberIds.includes(id));
    if (newIds.length === 0) return;
    startTransition(async () => {
      const results = await Promise.all(newIds.map((id) => addTeamMemberAction(team.id, id)));
      const failures = results.filter((r) => r?.error).length;
      if (failures > 0) {
        toast.error(failures === newIds.length ? t("errorGeneric") : t("memberAddPartialFailure", { count: failures }));
      } else {
        toast.success(t("memberAdded"));
      }
      router.refresh();
    });
  }

  async function handleRemove(userId: string) {
    const ok = await confirm({ title: t("confirmRemoveMember"), confirmLabel: t("removeMember") });
    if (!ok) return;
    setRemovingId(userId);
    startTransition(async () => {
      const result = await removeTeamMemberAction(team.id, userId);
      if (result?.error) toast.error(t(result.error as "errorGeneric"));
      else if (result?.success) toast.success(t(result.success as "memberRemoved"));
      setRemovingId(null);
      router.refresh();
    });
  }

  async function handleDeleteTeam() {
    const ok = await confirm({ title: t("confirmDelete"), confirmLabel: t("deleteTeam") });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteTeamAction(team.id);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else router.push("/teams");
    });
  }

  return (
    <>
      <TableShell>
        <TableToolbar>
          <div>
            <div className="text-[11px] font-medium text-veltol-fgMute">{t("detailEyebrow")}</div>
            <h2 className="mt-0.5 text-lg font-semibold text-veltol-fg">
              {t("memberCount", { count: members.length })}
            </h2>
          </div>
          {canMutate && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                {t("editTeam")}
              </Button>
              <Button size="sm" variant="destructive" disabled={isPending} onClick={handleDeleteTeam}>
                {t("deleteTeam")}
              </Button>
            </div>
          )}
        </TableToolbar>

        <TableDesktopView>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[t("columns.member"), t("columns.email"), t("columns.role"), ""].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyMembers")}
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.user_id} className="group transition-colors hover:bg-veltol-surface/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="grad-blue text-[10px] font-bold text-white">
                            {memberInitials(m)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-veltol-fg">
                          {`${m.profile?.first_name ?? ""} ${m.profile?.last_name ?? ""}`.trim() || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-veltol-fgDim">
                      {m.profile?.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="secondary">{m.profile?.role}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {canMutate && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isPending && removingId === m.user_id}
                          onClick={() => handleRemove(m.user_id)}
                        >
                          {isPending && removingId === m.user_id ? "..." : t("removeMember")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableDesktopView>

        {members.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyMembers")}</p>
        ) : (
          <DataCardList>
            {members.map((m) => (
              <DataCard key={m.user_id}>
                <DataCardHeader>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="grad-blue text-[10px] font-bold text-white">
                        {memberInitials(m)}
                      </AvatarFallback>
                    </Avatar>
                    <DataCardTitle>
                      {`${m.profile?.first_name ?? ""} ${m.profile?.last_name ?? ""}`.trim() || "—"}
                    </DataCardTitle>
                  </div>
                  <DataCardBadgeSlot>
                    <Badge variant="secondary">{m.profile?.role}</Badge>
                  </DataCardBadgeSlot>
                </DataCardHeader>

                <DataCardField label={t("columns.email")}>{m.profile?.email}</DataCardField>

                {canMutate && (
                  <DataCardFooter>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={isPending && removingId === m.user_id}
                      onClick={() => handleRemove(m.user_id)}
                    >
                      {isPending && removingId === m.user_id ? "..." : t("removeMember")}
                    </Button>
                  </DataCardFooter>
                )}
              </DataCard>
            ))}
          </DataCardList>
        )}

        {canMutate && (
          <div className="border-t border-border px-4 py-4 md:px-6">
            <TeamMemberPicker
              allProfiles={availableProfiles}
              selectedIds={[]}
              onChange={handleAdd}
            />
          </div>
        )}
      </TableShell>

      {isEditOpen && (
        <EditTeamDialog
          team={team}
          open={isEditOpen}
          onClose={() => {
            setEditOpen(false);
            router.refresh();
          }}
          allProfiles={allProfiles}
        />
      )}
    </>
  );
}
