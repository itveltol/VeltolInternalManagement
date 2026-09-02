"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { ensureProjectFolder } from "@/app/[locale]/(app)/projects/actions";

interface Props {
  projectId: number;
}

export function CreateFolderButton({ projectId }: Props) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await ensureProjectFolder(projectId);
      if (result?.error) {
        toast.error(t(result.error as "folderLinkError"));
        return;
      }
      toast.success(t("folderLinked"));
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? t("creatingFolder") : t("createFolder")}
    </Button>
  );
}
