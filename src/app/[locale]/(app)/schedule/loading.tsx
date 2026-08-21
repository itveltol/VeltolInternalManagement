import { PageHeaderSkeleton } from "@/shared/components/layout/PageHeaderSkeleton";
import { TableSkeleton } from "@/shared/components/layout/TableSkeleton";

export default function ScheduleLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} cols={7} />
    </div>
  );
}
