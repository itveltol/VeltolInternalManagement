"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import { createNoteAction, getMentionCandidatesAction, type ActionState } from "@/app/[locale]/(app)/board/actions";
import { MentionTextarea } from "./MentionTextarea";
import type { MentionCandidate, NoteAnchor, NoteKind, NoteVisibility } from "../types";

interface Props {
  /** Fixed anchor — used for a reply (inherits root) or a pre-anchored composer (matrice cell, project tab). */
  fixedAnchor?: NoteAnchor;
  fixedAnchorLabel?: string;
  parentId?: number | null;
  projectOptions?: { id: number; name: string }[];
  teamOptions?: { id: number; name: string }[];
  onSuccess?: () => void;
  autoFocus?: boolean;
}

export function NoteComposer({
  fixedAnchor,
  fixedAnchorLabel,
  parentId,
  projectOptions = [],
  teamOptions = [],
  onSuccess,
  autoFocus,
}: Props) {
  const t = useTranslations("comms");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createNoteAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  const [visibility, setVisibility] = useState<NoteVisibility>(fixedAnchor ? "project" : "private");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([]);

  // A reply always inherits the root's scope, not its own (replies carry no
  // anchor). fixedAnchor already reflects the root's project/team/personal
  // for both the reply case and pre-anchored composers (matrice cell,
  // project tab) — derive the equivalent visibility from it here so the
  // mention dropdown only offers people who already have access to that
  // scope, same rule the server re-enforces in insert_note_mentions.
  const effectiveVisibility: NoteVisibility = fixedAnchor
    ? fixedAnchor.isPersonal
      ? "private"
      : fixedAnchor.teamId != null
        ? "team"
        : fixedAnchor.projectId != null
          ? "project"
          : "company"
    : visibility;
  const effectiveProjectId = fixedAnchor ? fixedAnchor.projectId ?? null : projectId;
  const effectiveTeamId = fixedAnchor ? fixedAnchor.teamId ?? null : teamId;

  useEffect(() => {
    getMentionCandidatesAction({
      visibility: effectiveVisibility,
      projectId: effectiveProjectId,
      teamId: effectiveTeamId,
    }).then(setMentionCandidates);
  }, [effectiveVisibility, effectiveProjectId, effectiveTeamId]);

  // Reset the controlled scope fields during render on a fresh success,
  // same pattern as AnnouncementComposer — avoids a setState-in-effect
  // cascading render for state React already owns.
  const [lastHandledState, setLastHandledState] = useState<ActionState>(null);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.success) {
      setVisibility(fixedAnchor ? "project" : "private");
      setProjectId(null);
      setTeamId(null);
    }
  }

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

      {!isReply && fixedAnchor && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("composer.anchorLabel")}
          </label>
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
        </div>
      )}

      {!isReply && !fixedAnchor && (
        <input type="hidden" name="isPersonal" value={visibility === "private" ? "true" : "false"} />
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
            <Select
              name="visibility"
              value={visibility}
              onChange={(e) => {
                const next = e.target.value as NoteVisibility;
                setVisibility(next);
                setProjectId(null);
                setTeamId(null);
              }}
            >
              <option value="private">{t("visibility.private")}</option>
              <option value="project">{t("visibility.project")}</option>
            </Select>
          </div>
        </div>
      )}

      {!isReply && !fixedAnchor && visibility === "project" && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("fields.project")}
          </label>
          <Select
            name="projectId"
            required
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
            aria-invalid={Boolean(state?.fieldErrors?.projectId)}
          >
            <option value="" disabled>
              {t("fields.selectProject")}
            </option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <MentionTextarea
        candidates={mentionCandidates}
        name="body"
        required
        autoFocus={autoFocus}
        placeholder={isReply ? t("composer.replyPlaceholder") : t("composer.bodyPlaceholder")}
        rows={isReply ? 2 : 4}
        aria-invalid={Boolean(state?.fieldErrors?.body)}
      />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("composer.saving") : isReply ? t("composer.reply") : t("composer.publish")}
        </Button>
      </div>
    </form>
  );
}
