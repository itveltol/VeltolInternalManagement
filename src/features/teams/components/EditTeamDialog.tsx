"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { updateTeamAction } from "@/app/[locale]/(app)/teams/actions";
import type { Team } from "../types";
import type { ProfileRef } from "./TeamMemberPicker";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none";

interface Props {
  team: Team;
  open: boolean;
  onClose: () => void;
  allProfiles: ProfileRef[];
}

export function EditTeamDialog({ team, open, onClose, allProfiles }: Props) {
  const t = useTranslations("teams");
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [leadId, setLeadId] = useState(team.lead_id ?? "");
  const [state, action, pending] = useActionState(updateTeamAction, null);

  useEffect(() => {
    setName(team.name);
    setDescription(team.description ?? "");
    setLeadId(team.lead_id ?? "");
  }, [team]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("editTeam")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="teamId" value={team.id} />

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.name")} *</Label>
              <Input
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.description")}</Label>
              <textarea
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.lead")}</Label>
              <select
                name="lead_id"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="" className="bg-card">{t("fields.noLead")}</option>
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-card">
                    {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email}
                  </option>
                ))}
              </select>
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
              <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
