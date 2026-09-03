import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { memberInitials } from "../utils/memberInitials";

interface Props {
  manager: { id: string; name: string } | null;
  sales: { id: string; name: string } | null;
}

// PM stays a circle, Sales is a rounded square — the role is readable from shape
// alone, without relying on color or a hover title.
export function ProjectPmSalesChips({ manager, sales }: Props) {
  if (!manager && !sales) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {manager && (
        <Avatar className="h-6 w-6" title={`PM: ${manager.name}`}>
          <AvatarFallback className="grad-blue text-[9px] font-bold text-white">
            {memberInitials(manager.name)}
          </AvatarFallback>
        </Avatar>
      )}
      {sales && (
        <Avatar
          className="h-6 w-6 after:!rounded-md"
          style={{ borderRadius: "6px" }}
          title={`Sales: ${sales.name}`}
        >
          <AvatarFallback className="bg-veltol-accent text-[9px] font-bold text-white" style={{ borderRadius: "6px" }}>
            {memberInitials(sales.name)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
