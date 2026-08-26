import * as React from "react";
import { cn } from "@/shared/utils/cn";

interface Props {
  title: string;
  first?: boolean;
  children: React.ReactNode;
}

function FormSection({ title, first, children }: Props) {
  return (
    <div className={cn(!first && "mt-5 border-t border-border pt-5")}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-veltol-fgMute">
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export { FormSection };
