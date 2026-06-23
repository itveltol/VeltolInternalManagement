import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3! font-mono text-[10px] uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default:
          "border-veltol-aqua/30 bg-veltol-aqua/10 text-veltol-aqua",
        secondary:
          "border-veltol-fgMute/20 bg-veltol-surface/60 text-veltol-fgDim",
        destructive:
          "border-veltol-red/30 bg-veltol-red/10 text-veltol-red",
        outline:
          "border-veltol-fgMute/30 text-veltol-fgDim",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        info:
          "border-veltol-teal/30 bg-veltol-teal/10 text-veltol-teal",
        warning:
          "border-veltol-amber/30 bg-veltol-amber/10 text-veltol-amber",
        success:
          "border-veltol-green/30 bg-veltol-green/10 text-veltol-green",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
