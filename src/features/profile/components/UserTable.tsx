"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Pagination } from "@/shared/components/ui/pagination";
import { EditUserDialog } from "./EditUserDialog";
import { InviteUserDialog } from "./InviteUserDialog";
import { deleteUser } from "@/app/[locale]/(app)/profile/actions";
import { useProfileStore } from "../hooks/useProfileStore";
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function initials(p: Profile) {
  const f = p.first_name?.[0] ?? "";
  const l = p.last_name?.[0] ?? "";
  if (f || l) return (f + l).toUpperCase();
  return (p.email?.[0] ?? "?").toUpperCase();
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
  const [isPending, startTransition] = useTransition();

  const {
    editingUser, deletingId,
    isInviteDialogOpen,
    openEditUser, closeEditUser,
    openInviteDialog, closeInviteDialog,
    setDeletingId,
  } = useProfileStore();

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleDelete(userId: string) {
    if (!confirm(`${t("deleteUser")}?`)) return;
    setDeletingId(userId);
    startTransition(async () => {
      await deleteUser(userId);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <div className="text-[11px] font-medium text-veltol-fgMute">
              {t("adminEyebrow")}
            </div>
            <h2 className="mt-0.5 text-lg font-semibold text-veltol-fg">
              {t("adminTitle")}
            </h2>
          </div>
          <Button onClick={openInviteDialog} variant="outline">
            {t("inviteUser")}
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
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
                          <AvatarFallback className="bg-veltol-primary text-[10px] font-bold text-white">
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
                      {new Date(user.created_at).toLocaleDateString()}
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
