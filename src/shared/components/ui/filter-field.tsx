import * as React from "react"
import { ChevronDownIcon, CheckIcon } from "lucide-react"

import { cn } from "@/shared/utils/cn"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from "@/shared/components/ui/dropdown-menu"

function FilterField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label
        htmlFor={htmlFor}
        className="px-0.5 text-[10.5px] font-semibold tracking-wide text-veltol-fgMute uppercase"
      >
        {label}
      </Label>
      {children}
    </div>
  )
}

interface FilterDropdownOption {
  value: string
  label: string
}

function FilterDropdown({
  id,
  value,
  onChange,
  allLabel,
  options,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: FilterDropdownOption[]
  className?: string
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-medium text-veltol-fg shadow-sm transition-colors outline-none hover:bg-veltol-hover focus-visible:border-veltol-accent focus-visible:ring-2 focus-visible:ring-veltol-accent/20 data-popup-open:bg-veltol-hover",
          !selected && "text-veltol-fgMute",
          className
        )}
      >
        <span className="truncate">{selected ? selected.label : allLabel}</span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-veltol-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange("")}>
          <CheckIcon className={cn("size-3.5", value !== "" ? "invisible" : undefined)} />
          {allLabel}
        </DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => onChange(o.value)}>
            <CheckIcon className={cn("size-3.5", value !== o.value ? "invisible" : undefined)} />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterMultiDropdown({
  id,
  value,
  onChange,
  allLabel,
  options,
  className,
}: {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  allLabel: string
  options: FilterDropdownOption[]
  className?: string
}) {
  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label)

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-medium text-veltol-fg shadow-sm transition-colors outline-none hover:bg-veltol-hover focus-visible:border-veltol-accent focus-visible:ring-2 focus-visible:ring-veltol-accent/20 data-popup-open:bg-veltol-hover",
          selectedLabels.length === 0 && "text-veltol-fgMute",
          className
        )}
      >
        <span className="truncate">
          {selectedLabels.length === 0
            ? allLabel
            : selectedLabels.length === 1
              ? selectedLabels[0]
              : `${selectedLabels[0]} +${selectedLabels.length - 1}`}
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-veltol-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={value.includes(o.value)}
            onCheckedChange={() => toggle(o.value)}
            closeOnClick={false}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="filter-input"
      className={cn("h-8 w-24 text-[13px]", className)}
      {...props}
    />
  )
}

export { FilterField, FilterDropdown, FilterMultiDropdown, FilterInput }
export type { FilterDropdownOption }
