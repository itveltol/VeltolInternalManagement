"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  prevLabel: string;
  nextLabel: string;
  pageLabel: (page: number, pageCount: number) => string;
}

export function Pagination({ page, pageCount, onPageChange, prevLabel, nextLabel, pageLabel }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-6 py-3">
      <span className="font-mono text-[11px] text-veltol-fgMute">{pageLabel(page, pageCount)}</span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {prevLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {nextLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
