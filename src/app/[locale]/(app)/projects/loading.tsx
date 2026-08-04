import { PageHeaderSkeleton } from "@/shared/components/layout/PageHeaderSkeleton";
import { TableSkeleton } from "@/shared/components/layout/TableSkeleton";

export default function ProjectsLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} cols={8} />
    </div>
  );
}
