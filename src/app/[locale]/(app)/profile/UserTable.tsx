"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EditUserDialog } from "./EditUserDialog";
import { InviteUserDialog } from "./InviteUserDialog";
import { deleteUser } from "./actions";
import type { Profile, AppRole } from "@/lib/types/profile";

const ROLE_VARIANT: Record<AppRole, "default" | "warning" | "info" | "secondary" | "success"> = {
  admin: "default",
  project_manager: "info",
  site_engineer: "warning",
  finance: "success",
  viewer: "secondary",
};

export function UserTable({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(userId: string) {
    if (!confirm(`${t("deleteUser")}?`)) return;
    setDeletingId(userId);
    startTransition(async () => {
      await deleteUser(userId);
      setDeletingId(null);
      router.refresh();
    });
  }

  function initials(p: Profile) {
    const f = p.first_name?.[0] ?? "";
    const l = p.last_name?.[0] ?? "";
    if (f || l) return (f + l).toUpperCase();
    return (p.email?.[0] ?? "?").toUpperCase();
  }

  return (
    <>
      <div className="v-panel v-hairline overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <div className="mono-label text-[9px] text-veltol-fgMute">
              {t("adminEyebrow")}
            </div>
            <h2 className="mt-0.5 font-display text-lg font-semibold text-veltol-fg">
              {t("adminTitle")}
            </h2>
          </div>
          <Button onClick={() => setInviting(true)} variant="outline">
            {t("inviteUser")}
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {[
                  t("colUser"),
                  t("colPhone"),
                  t("colRole"),
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
              {users.map((user) => {
                const isMe = user.id === currentUserId;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                  >
                    {/* User cell */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback
                            className="text-[10px] font-bold text-white"
                            style={{
                              background:
                                "linear-gradient(135deg, #0B1E3E 0%, #163D64 25%, #1A5F88 45%, #1E8FA2 70%, #2BC4C8 100%)",
                            }}
                          >
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

                    {/* Phone */}
                    <td className="px-6 py-3 font-mono text-[12px] text-veltol-fgDim">
                      {user.phone ?? "—"}
                    </td>

                    {/* Role */}
                    <td className="px-6 py-3">
                      <Badge variant={ROLE_VARIANT[user.role]}>
                        {t(`role_${user.role}`)}
                      </Badge>
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-3 font-mono text-[12px] text-veltol-fgDim">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isMe}
                          onClick={() => setEditingUser(user)}
                        >
                          {t("editUser")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isMe || (isPending && deletingId === user.id)}
                          onClick={() => handleDelete(user.id)}
                        >
                          {isPending && deletingId === user.id
                            ? "..."
                            : t("deleteUser")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => {
            setEditingUser(null);
            router.refresh();
          }}
        />
      )}

      <InviteUserDialog
        open={inviting}
        onClose={() => setInviting(false)}
      />
    </>
  );
}
