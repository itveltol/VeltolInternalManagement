"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/shared/components/ui/label";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } from "../types";
import type { DocumentCategory, DocumentStatus, Document } from "../types";
import type { ResponsibleProfile } from "../hooks/useDocumentsStore";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 appearance-none";

interface Props {
  defaults?: Partial<Document>;
  responsibleProfiles: ResponsibleProfile[];
  isRenewable: boolean;
  onIsRenewableChange: (v: boolean) => void;
  status: DocumentStatus | "";
  onStatusChange: (v: DocumentStatus | "") => void;
}

function fullName(p: ResponsibleProfile) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id;
}

export function DocumentFormFields({
  defaults,
  responsibleProfiles,
  isRenewable,
  onIsRenewableChange,
  status,
  onStatusChange,
}: Props) {
  const t = useTranslations("documents");

  const showSubmittedAt = status === "submitted" || status === "obtained" || status === "rejected";
  const showObtainedAt = status === "obtained";

  return (
    <>
      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.name")} *</Label>
        <input
          name="name"
          type="text"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder={t("fields.namePlaceholder")}
          className={INPUT_CLASS}
        />
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.url")} *</Label>
        <input
          name="url"
          type="url"
          required
          defaultValue={defaults?.url ?? ""}
          placeholder="https://veltolholding.sharepoint.com/..."
          className={INPUT_CLASS}
        />
      </div>

      {/* Category + Status row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.category")}</Label>
          <select name="category" defaultValue={defaults?.category ?? ""} className={SELECT_CLASS}>
            <option value="">—</option>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`category.${c}`)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.status")}</Label>
          <select
            name="status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as DocumentStatus | "")}
            className={SELECT_CLASS}
          >
            <option value="">—</option>
            {DOCUMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submitted at (shown when submitted/obtained/rejected) */}
      {showSubmittedAt && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.submittedAt")}</Label>
          <input
            name="submitted_at"
            type="date"
            defaultValue={defaults?.submitted_at ?? ""}
            className={INPUT_CLASS}
          />
        </div>
      )}

      {/* Obtained at (shown when obtained) */}
      {showObtainedAt && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.obtainedAt")}</Label>
          <input
            name="obtained_at"
            type="date"
            defaultValue={defaults?.obtained_at ?? ""}
            className={INPUT_CLASS}
          />
        </div>
      )}

      {/* Responsible person */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.responsible")}</Label>
        <select name="responsible_id" defaultValue={defaults?.responsible_id ?? ""} className={SELECT_CLASS}>
          <option value="">—</option>
          {responsibleProfiles.map((p) => (
            <option key={p.id} value={p.id}>{fullName(p)}</option>
          ))}
        </select>
      </div>

      {/* Version */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.version")}</Label>
        <input
          name="version"
          type="number"
          min={1}
          defaultValue={defaults?.version ?? 1}
          className={INPUT_CLASS}
        />
      </div>

      {/* Renewable toggle */}
      <div className="flex items-center gap-2.5">
        <input
          id="is_renewable"
          name="is_renewable"
          type="checkbox"
          checked={isRenewable}
          onChange={(e) => onIsRenewableChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border border-border bg-veltol-surface/60 accent-veltol-accent"
        />
        <Label htmlFor="is_renewable" className="cursor-pointer text-[11px] font-medium text-veltol-fgMute">
          {t("fields.isRenewable")}
        </Label>
      </div>

      {/* Expiry date (only when renewable) */}
      {isRenewable && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.expiresAt")}</Label>
          <input
            name="expires_at"
            type="date"
            defaultValue={defaults?.expires_at ?? ""}
            className={INPUT_CLASS}
          />
        </div>
      )}
    </>
  );
}
