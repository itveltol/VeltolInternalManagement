"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Folder, File, Download, Loader2 } from "lucide-react";
import { getProjectFolderChildren } from "@/app/[locale]/(app)/projects/[id]/actions";
import { formatDate } from "@/shared/utils/formatDate";
import type { DriveChildItem } from "@/core/microsoft/folderProvider";

interface Crumb {
  id: string;
  name: string;
}

interface Props {
  rootFolderId: string | null;
  initialChildren: DriveChildItem[];
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectFilesTab({ rootFolderId, initialChildren }: Props) {
  const t = useTranslations("documents");
  const [isPending, startTransition] = useTransition();
  const [crumbs, setCrumbs] = useState<Crumb[]>(
    rootFolderId ? [{ id: rootFolderId, name: t("files.sectionTitle") }] : [],
  );
  // null = viewing the root: always reflect the latest `initialChildren` prop
  // (kept fresh by the parent after uploads/deletes). Non-null = drilled into
  // a subfolder, whose contents were fetched explicitly and don't change
  // until the user navigates.
  const [drilledChildren, setDrilledChildren] = useState<DriveChildItem[] | null>(null);
  const children = drilledChildren ?? initialChildren;

  function openFolder(id: string, name: string) {
    startTransition(async () => {
      const fresh = await getProjectFolderChildren(id);
      setDrilledChildren(fresh);
      setCrumbs((prev) => [...prev, { id, name }]);
    });
  }

  function goToCrumb(index: number) {
    const target = crumbs[index];
    startTransition(async () => {
      if (target.id === rootFolderId) {
        setDrilledChildren(null);
      } else {
        const fresh = await getProjectFolderChildren(target.id);
        setDrilledChildren(fresh);
      }
      setCrumbs((prev) => prev.slice(0, index + 1));
    });
  }

  if (!rootFolderId) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card p-6">
        <p className="font-mono text-[11px] text-veltol-fgMute">{t("files.noFolder")}</p>
      </div>
    );
  }

  const sorted = [...children].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <nav className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-veltol-fgMute">
          {crumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              {i > 0 && <span>/</span>}
              {i === crumbs.length - 1 ? (
                <span className="text-veltol-accent">{crumb.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => goToCrumb(i)}
                  className="transition-colors hover:text-veltol-fgDim"
                >
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </nav>
        {isPending && <Loader2 className="size-3.5 animate-spin text-veltol-fgMute" />}
      </div>

      <div className="p-2">
        {sorted.length === 0 ? (
          <p className="px-4 py-6 font-mono text-[11px] text-veltol-fgMute">{t("files.empty")}</p>
        ) : (
          sorted.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 hover:bg-veltol-surface/60"
            >
              {item.type === "folder" ? (
                <button
                  type="button"
                  onClick={() => openFolder(item.id, item.name)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left font-mono text-[12px] text-veltol-fg"
                >
                  <Folder className="size-4 shrink-0 text-veltol-fgMute" />
                  <span className="truncate">{item.name}</span>
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[12px] text-veltol-fg">
                  <File className="size-4 shrink-0 text-veltol-fgMute" />
                  <span className="truncate">{item.name}</span>
                </div>
              )}

              <div className="flex shrink-0 items-center gap-4 font-mono text-[11px] text-veltol-fgMute">
                <span className="hidden sm:inline">{formatSize(item.size)}</span>
                <span className="hidden md:inline">
                  {item.lastModifiedDateTime ? formatDate(item.lastModifiedDateTime) : "—"}
                </span>
                {item.type === "file" && (
                  <a
                    href={`/api/onedrive/${item.id}/content`}
                    download
                    className="inline-flex items-center gap-1 text-veltol-accent transition-opacity hover:opacity-75"
                  >
                    <Download className="size-3.5" />
                    {t("files.download")}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
