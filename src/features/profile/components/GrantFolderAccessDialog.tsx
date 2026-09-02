"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxValue,
  ComboboxInput,
  ComboboxClear,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxEmpty,
} from "@/shared/components/ui/combobox";
import {
  grantUserProjectFolderAccess,
  searchProjectsAction,
} from "@/app/[locale]/(app)/projects/actions";
import type { ProjectOption } from "@/features/projects/api/types";
import type { Profile } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  users: Profile[];
}

export function GrantFolderAccessDialog({ open, onClose, users }: Props) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState(grantUserProjectFolderAccess, null);
  const [email, setEmail] = useState("");
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [items, setItems] = useState<ProjectOption[]>([]);
  const [isSearching, startSearch] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    startSearch(async () => {
      const results = await searchProjectsAction("");
      setItems(results);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, startSearch]);

  function handleProjectQueryChange(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startSearch(async () => {
        const results = await searchProjectsAction(query);
        setItems(results);
      });
    }, 250);
  }

  function handleDone() {
    setEmail("");
    setProject(null);
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && handleDone()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("grantAccessTitle")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="projectId" value={project?.id ?? ""} />

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">
                {t("grantAccessUser")}
              </Label>
              <select
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20"
              >
                <option value="" disabled className="bg-card">
                  {t("grantAccessUserPlaceholder")}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.email ?? ""} className="bg-card">
                    {u.first_name || u.last_name ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() : u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">
                {t("grantAccessProject")}
              </Label>
              <Combobox
                items={items}
                value={project}
                onValueChange={setProject}
                onInputValueChange={handleProjectQueryChange}
                itemToStringLabel={(p: ProjectOption) => p.name}
              >
                <ComboboxInputGroup>
                  <ComboboxValue />
                  <ComboboxInput placeholder={t("grantAccessProjectPlaceholder")} />
                  <ComboboxClear />
                </ComboboxInputGroup>
                <ComboboxPortal>
                  <ComboboxPositioner>
                    <ComboboxPopup>
                      <ComboboxEmpty>
                        {isSearching ? t("grantAccessSearching") : t("grantAccessNoProjects")}
                      </ComboboxEmpty>
                      <ComboboxList>
                        {(p: ProjectOption) => (
                          <ComboboxItem key={p.id} value={p}>
                            <ComboboxItemIndicator />
                            {p.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxPopup>
                  </ComboboxPositioner>
                </ComboboxPortal>
              </Combobox>
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">
                {t(state.error as Parameters<typeof t>[0])}
              </p>
            )}
            {state?.success && (
              <p className="text-sm text-veltol-green">
                {t(state.success as Parameters<typeof t>[0])}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close
                render={
                  <Button type="button" variant="outline" onClick={handleDone}>
                    {t("cancel")}
                  </Button>
                }
              />
              <Button type="submit" disabled={pending || !email || !project}>
                {pending ? t("grantAccessSubmitting") : t("grantAccessSubmit")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
