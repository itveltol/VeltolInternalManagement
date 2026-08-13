"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import {
  createAnnouncementAction,
  previewAudienceAction,
  type ActionState,
} from "@/app/[locale]/(app)/announcements/actions";
import type { NoteVisibility } from "../types";

interface Props {
  projectOptions: { id: number; name: string }[];
  teamOptions: { id: number; name: string }[];
  onSuccess?: () => void;
}

export function AnnouncementComposer({ projectOptions, teamOptions, onSuccess }: Props) {
  const t = useTranslations("comms");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAnnouncementAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  const [visibility, setVisibility] = useState<Exclude<NoteVisibility, "private">>("company");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [previewedScope, setPreviewedScope] = useState<string | null>(null);
  const [isPreviewing, startPreview] = useTransition();

  // Adjusting state during render (React's documented alternative to an
  // effect for "props/state changed" comparisons — same pattern NavContent.tsx
  // uses for pendingHref): reset the controlled fields the instant a fresh
  // success comes back from useActionState, without a setState-in-effect.
  const [lastHandledState, setLastHandledState] = useState<ActionState>(null);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.success) {
      setVisibility("company");
      setProjectId(null);
      setTeamId(null);
      setAudienceCount(null);
      setPreviewedScope(null);
    }
  }

  // The toast/form-reset/onSuccess callback are genuine external-system side
  // effects (DOM reset, toast portal, parent callback), so they stay in an
  // effect keyed on the same state transition.
  useEffect(() => {
    if (state?.success) {
      toast.success(t(`announcements.${state.success}` as "announcements.announcementCreated"));
      formRef.current?.reset();
      onSuccess?.();
    } else if (state?.error) {
      toast.error(t(state.error as "errorGeneric"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const scopeIsReady =
    visibility === "company" || (visibility === "project" && projectId != null) || (visibility === "team" && teamId != null);
  const scopeKey = `${visibility}:${projectId ?? ""}:${teamId ?? ""}`;

  useEffect(() => {
    if (!scopeIsReady) return;
    startPreview(async () => {
      try {
        const count = await previewAudienceAction({ visibility, projectId, teamId });
        setAudienceCount(count);
      } catch {
        setAudienceCount(null);
      } finally {
        setPreviewedScope(scopeKey);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, scopeIsReady]);

  // Selection changed since the last resolved preview — show the loading/
  // pending copy instead of a stale count, without needing a reset effect.
  const isShowingStaleCount = previewedScope !== scopeKey;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
          {t("composer.visibilityLabel")}
        </label>
        <Select
          name="visibility"
          value={visibility}
          onChange={(e) => {
            const next = e.target.value as Exclude<NoteVisibility, "private">;
            setVisibility(next);
            setProjectId(null);
            setTeamId(null);
          }}
        >
          <option value="company">{t("visibility.company")}</option>
          <option value="team">{t("visibility.team")}</option>
          <option value="project">{t("visibility.project")}</option>
        </Select>
      </div>

      {visibility === "project" && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("fields.project")}
          </label>
          <Select
            name="projectId"
            required
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
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

      {visibility === "team" && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
            {t("fields.team")}
          </label>
          <Select
            name="teamId"
            required
            value={teamId ?? ""}
            onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="" disabled>
              {t("fields.selectTeam")}
            </option>
            {teamOptions.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div
        className="rounded-lg border border-veltol-accent/20 bg-veltol-tint px-3 py-2 text-[13px] font-medium text-veltol-primary"
        aria-live="polite"
      >
        {!scopeIsReady
          ? t("composer.audiencePreviewPending")
          : isPreviewing || isShowingStaleCount
            ? t("composer.audiencePreviewLoading")
            : t("composer.audiencePreview", { count: audienceCount ?? 0 })}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
          {t("fields.titleOptional")}
        </label>
        <Input name="title" placeholder={t("fields.titleOptional")} />
      </div>

      <Textarea name="body" required placeholder={t("composer.bodyPlaceholder")} rows={5} />

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[.06em] text-veltol-fgMute">
          {t("fields.ackDeadline")}
        </label>
        <Input type="date" name="ackDeadline" />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("composer.saving") : t("composer.publish")}
        </Button>
      </div>
    </form>
  );
}
