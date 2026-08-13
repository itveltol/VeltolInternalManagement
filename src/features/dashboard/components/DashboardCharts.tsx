"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/shared/components/ui/skeleton";

// next/dynamic with ssr:false is only allowed from a Client Component —
// this wrapper exists so dashboard/page.tsx (a Server Component) can still
// keep recharts out of its initial bundle, mirroring the ssr:false pattern
// already used for leaflet in ProjectOverviewPanel.tsx/ProjectFormFields.tsx.
export const IncomeByMonthChart = dynamic(
  () => import("./IncomeByMonthChart").then((m) => m.IncomeByMonthChart),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> },
);

export const IncomeCompareChart = dynamic(
  () => import("./IncomeCompareChart").then((m) => m.IncomeCompareChart),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full" /> },
);
