"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select } from "@/shared/components/ui/select";
import { createNoteAction, type ActionState } from "@/app/[locale]/(app)/board/actions";
import type { NoteAnchor, NoteKind } from "../types";

interface Props {
  /** Fixed anchor — used for a reply (inherits root) or a pre-anchored composer (matrice cell, project tab). */
  fixedAnchor?: NoteAnchor;
  fixedAnchorLabel?: string;
  parentId?: number | null;
  onSuccess?: () => void;
  autoFocus?: boolean;
}

export function NoteComposer({ fixedAnchor, fixedAnchorLabel, parentId, onSuccess, autoFocus }: Props) {
  const t = useTranslations("comms");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createNoteAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(t(state.success as "noteCreated"));
      formRef.current?.reset();
      onSuccess?.();
    } else if (state?.error) {
      toast.error(t(state.error as "errorGeneric"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const isReply = parentId != null;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      {parentId != null && <input type="hidden" name="parentId" value={parentId} />}

      {!isReply && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("composer.anchorLabel")}
          </label>
          {fixedAnchor ? (
            <>
              <div className="rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1.5 text-[13px] font-medium text-veltol-fgDim">
                {fixedAnchorLabel}
              </div>
              <input type="hidden" name="isPersonal" value={fixedAnchor.isPersonal ? "true" : "false"} />
              {fixedAnchor.projectId != null && (
                <input type="hidden" name="projectId" value={fixedAnchor.projectId} />
              )}
              {fixedAnchor.activityId != null && (
                <input type="hidden" name="activityId" value={fixedAnchor.activityId} />
              )}
            </>
          ) : (
            <Select name="isPersonal" required defaultValue="true">
              <option value="true">{t("anchorPersonal")}</option>
            </Select>
          )}
        </div>
      )}

      {!isReply && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
              {t("composer.kindLabel")}
            </label>
            <Select name="kind" defaultValue={"note" satisfies NoteKind}>
              <option value="note">{t("kind.note")}</option>
              <option value="question">{t("kind.question")}</option>
              <option value="decision">{t("kind.decision")}</option>
              <option value="risk">{t("kind.risk")}</option>
              <option value="announcement">{t("kind.announcement")}</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
              {t("composer.visibilityLabel")}
            </label>
            <Select name="visibility" defaultValue={fixedAnchor ? "project" : "private"}>
              <option value="private">{t("visibility.private")}</option>
              <option value="team">{t("visibility.team")}</option>
              <option value="project">{t("visibility.project")}</option>
              <option value="company">{t("visibility.company")}</option>
            </Select>
          </div>
        </div>
      )}

      <Textarea
        name="body"
        required
        autoFocus={autoFocus}
        placeholder={isReply ? t("composer.replyPlaceholder") : t("composer.bodyPlaceholder")}
        rows={isReply ? 2 : 4}
      />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("composer.saving") : isReply ? t("composer.reply") : t("composer.publish")}
        </Button>
      </div>
    </form>
  );
}
