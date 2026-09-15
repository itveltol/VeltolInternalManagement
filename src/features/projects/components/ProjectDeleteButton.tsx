"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { deleteProject } from "@/app/[locale]/(app)/projects/actions";

export function ProjectDeleteButton({ projectId }: { projectId: number }) {
  const t = useTranslations("projects");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const ok = await confirm({
      title: t("confirmDelete"),
      description: t("confirmDeleteResidentialWarning"),
      tone: "danger",
      confirmLabel: t("deleteProject"),
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (result?.error) {
        toast.error(t(result.error as "errorNotAllowed" | "errorGeneric"));
      } else {
        toast.success(t((result?.success ?? "projectDeleted") as "projectDeleted"));
        router.push("/projects");
      }
    });
  }

  return (
    <Button size="sm" variant="destructive" disabled={isPending} onClick={handleDelete}>
      {t("deleteProject")}
    </Button>
  );
}
