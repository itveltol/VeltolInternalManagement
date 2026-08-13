import * as React from "react";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";

interface Props {
  label: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

function FormField({ label, required, className, children }: Props) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11px] font-medium text-veltol-fgMute">
        {label}
        {required && " *"}
      </Label>
      {children}
    </div>
  );
}

export { FormField };
