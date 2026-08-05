"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Pagination } from "@/shared/components/ui/pagination";
import { FilterField, FilterInput } from "@/shared/components/ui/filter-field";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardSubtitle,
  DataCardBadgeSlot, DataCardBody, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { EditUserDialog } from "./EditUserDialog";
import { InviteUserDialog } from "./InviteUserDialog";
import { deleteUser } from "@/app/[locale]/(app)/profile/actions";
import { useProfileStore } from "../hooks/useProfileStore";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils/formatDate";
import type { Profile, AppRole } from "../types";

const PAGE_SIZE = 20;

const ROLE_VARIANT: Record<AppRole, "default" | "warning" | "info" | "secondary" | "success" | "outline"> = {
  admin: "default",
  project_manager: "info",
  site_engineer: "warning",
  finance: "success",
  viewer: "secondary",
  outfield_worker: "outline",
};

function medicalExpiryState(date: string | null): "expired" | "soon" | "ok" | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return "expired";
  if (diff < 30 * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

function initials(p: Profile) {
  const f = p.first_name?.[0] ?? "";
  const l = p.last_name?.[0] ?? "";
  if (f || l) return (f + l).toUpperCase();
  return (p.email?.[0] ?? "?").toUpperCase();
}

function toUserRow(user: Profile, currentUserId: string) {
  return {
    isMe: user.id === currentUserId,
    displayName: user.first_name || user.last_name
      ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
      : "—",
    initials: initials(user),
    medicalState: medicalExpiryState(user.medical_exam_expires_at),
    medicalDateLabel: user.medical_exam_expires_at ? formatDate(user.medical_exam_expires_at) : "—",
    joinedLabel: formatDate(user.created_at),
  };
}

export function UserTable({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const {
    editingUser, deletingId,
    isInviteDialogOpen,
    openEditUser, closeEditUser,
    openInviteDialog, closeInviteDialog,
    setDeletingId,
  } = useProfileStore();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase();
    const query = search.trim().toLowerCase();
    return name.includes(query) || (u.email ?? "").toLowerCase().includes(query);
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleDelete(userId: string) {
    const ok = await confirm({ title: `${t("deleteUser")}?`, confirmLabel: t("deleteUser") });
    if (!ok) return;
    setDeletingId(userId);
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAdmin" | "errorSelfDelete"));
      else if (result?.success) toast.success(t(result.success as "userDeleted"));
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      <TableShell>
        {/* Header */}
        <TableToolbar>
          <div>
            <div className="text-[11px] font-medium text-veltol-fgMute">
              {t("adminEyebrow")}
            </div>
            <h2 className="mt-0.5 text-lg font-semibold text-veltol-fg">
              {t("adminTitle")}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <FilterField label={t("searchPlaceholder")} htmlFor="users-search">
              <FilterInput
                id="users-search"
                type="search"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-56"
              />
            </FilterField>
            <Button onClick={openInviteDialog} variant="outline">
              {t("inviteUser")}
            </Button>
          </div>
        </TableToolbar>

        {/* Table */}
        <TableDesktopView>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  t("colUser"),
                  t("colPhone"),
                  t("colRole"),
                  t("colMedicalExam"),
                  t("colJoined"),
                  t("colActions"),
                ].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-veltol-fgMute"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user) => {
                const isMe = user.id === currentUserId;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0 hover:bg-veltol-surface/50"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="grad-blue text-[10px] font-bold text-white">
                            {initials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-[13px] font-medium text-veltol-fg">
                            {user.first_name || user.last_name
                              ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                              : "—"}
                            {isMe && (
                              <span className="ml-1.5 font-mono text-[10px] text-veltol-fgMute">
                                {t("youLabel")}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-veltol-fgMute">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3 font-mono text-[12px] text-veltol-fgDim">
                      {user.phone ?? "—"}
                    </td>

                    <td className="px-6 py-3">
                      <Badge variant={ROLE_VARIANT[user.role]}>
                        {t(`role_${user.role}`)}
                      </Badge>
                    </td>

                    <td className="px-6 py-3">
                      {(() => {
                        const state = medicalExpiryState(user.medical_exam_expires_at);
                        if (!user.medical_exam_expires_at) {
                          return <span className="font-mono text-[11px] text-veltol-fgMute">—</span>;
                        }
                        return (
                          <span className={
                            state === "expired" ? "font-mono text-[11px] font-semibold text-veltol-red" :
                            state === "soon"    ? "font-mono text-[11px] font-semibold text-veltol-orange" :
                                                  "font-mono text-[11px] text-veltol-fgDim"
                          }>
                            {formatDate(user.medical_exam_expires_at)}
                            {state === "expired" && (
                              <span className="ml-1.5 rounded bg-veltol-red/15 px-1 py-0.5 text-[9px] uppercase tracking-wide text-veltol-red">
                                {t("medicalExpired")}
                              </span>
                            )}
                            {state === "soon" && (
                              <span className="ml-1.5 rounded bg-veltol-orange/10 px-1 py-0.5 text-[9px] uppercase tracking-wide text-veltol-orange">
                                {t("medicalExpiringSoon")}
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-3 font-mono text-[12px] text-veltol-fgDim">
                      {formatDate(user.created_at)}
                    </td>

                    <td className="px-6 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          title={t("editUser")}
                          disabled={isMe}
                          onClick={() => openEditUser(user)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="destructive"
                          title={t("deleteUser")}
                          disabled={isMe || (isPending && deletingId === user.id)}
                          onClick={() => handleDelete(user.id)}
                        >
                          {isPending && deletingId === user.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableDesktopView>

        {pagedUsers.length === 0 ? null : (
          <DataCardList>
            {pagedUsers.map((user) => {
              const row = toUserRow(user, currentUserId);
              return (
                <DataCard key={user.id}>
                  <DataCardHeader>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="grad-blue text-[10px] font-bold text-white">
                          {row.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <DataCardTitle className="flex items-center gap-1.5">
                          {row.displayName}
                          {row.isMe && (
                            <span className="font-mono text-[10px] text-veltol-fgMute">{t("youLabel")}</span>
                          )}
                        </DataCardTitle>
                        <DataCardSubtitle className="font-mono">{user.email}</DataCardSubtitle>
                      </div>
                    </div>
                    <DataCardBadgeSlot>
                      <Badge variant={ROLE_VARIANT[user.role]}>{t(`role_${user.role}`)}</Badge>
                    </DataCardBadgeSlot>
                  </DataCardHeader>

                  <DataCardBody>
                    <DataCardField label={t("colPhone")}>{user.phone ?? "—"}</DataCardField>
                    <DataCardField label={t("colJoined")}>{row.joinedLabel}</DataCardField>
                    <DataCardField label={t("colMedicalExam")} full>
                      <span className={
                        row.medicalState === "expired" ? "font-semibold text-veltol-red" :
                        row.medicalState === "soon" ? "font-semibold text-veltol-orange" : undefined
                      }>
                        {row.medicalDateLabel}
                        {row.medicalState === "expired" && (
                          <span className="ml-1.5 rounded bg-veltol-red/15 px-1 py-0.5 text-[9px] uppercase tracking-wide text-veltol-red">
                            {t("medicalExpired")}
                          </span>
                        )}
                        {row.medicalState === "soon" && (
                          <span className="ml-1.5 rounded bg-veltol-orange/10 px-1 py-0.5 text-[9px] uppercase tracking-wide text-veltol-orange">
                            {t("medicalExpiringSoon")}
                          </span>
                        )}
                      </span>
                    </DataCardField>
                  </DataCardBody>

                  <DataCardFooter>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={row.isMe}
                      onClick={() => openEditUser(user)}
                    >
                      <Pencil data-icon="inline-start" /> {t("editUser")}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={row.isMe || (isPending && deletingId === user.id)}
                      onClick={() => handleDelete(user.id)}
                    >
                      {isPending && deletingId === user.id ? <Loader2 className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
                      {t("deleteUser")}
                    </Button>
                  </DataCardFooter>
                </DataCard>
              );
            })}
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

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => {
            closeEditUser();
            router.refresh();
          }}
        />
      )}

      <InviteUserDialog
        open={isInviteDialogOpen}
        onClose={closeInviteDialog}
      />
    </>
  );
}
