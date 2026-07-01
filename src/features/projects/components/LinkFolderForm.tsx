"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { linkProjectFolder } from "@/app/[locale]/(app)/projects/actions";

interface Props {
  projectId: number;
}

export function LinkFolderForm({ projectId }: Props) {
  const t = useTranslations("projects");

  const action = async (prev: { error?: string; success?: string } | null, formData: FormData) => {
    const input = (formData.get("folderUrl") as string | null)?.trim() ?? "";
    return linkProjectFolder(projectId, input);
  };

  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <Input
        name="folderUrl"
        placeholder={t("linkFolderPlaceholder")}
        className="w-72 max-w-full text-[12px]"
        required
      />
      <Button type="submit" disabled={pending} size="sm">
        {t("linkFolderSave")}
      </Button>
      {state?.error && (
        <span className="font-mono text-[11px] text-veltol-red">
          {t(state.error as Parameters<typeof t>[0])}
        </span>
      )}
      {state?.success && (
        <span className="font-mono text-[11px] text-veltol-green">
          {t(state.success as Parameters<typeof t>[0])}
        </span>
      )}
    </form>
  );
}
