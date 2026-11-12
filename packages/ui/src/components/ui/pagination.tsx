"use client";

import { type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps extends HTMLAttributes<HTMLDivElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  ...props
}: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((page, index) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            );
          }
          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(page as number)}
              aria-current={currentPage === page ? "page" : undefined}
              aria-label={`Go to page ${page}`}
            >
              {page}
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | "...")[] {
  const delta = 1;
  const range: number[] = [];
  const rangeWithEllipsis: (number | "...")[] = [];

  for (
    let i = Math.max(2, currentPage - delta);
    i <= Math.min(totalPages - 1, currentPage + delta);
    i++
  ) {
    range.push(i);
  }

  if (currentPage - delta > 2) {
    rangeWithEllipsis.push(1, "...");
  } else {
    rangeWithEllipsis.push(1);
  }

  rangeWithEllipsis.push(...range);

  if (currentPage + delta < totalPages - 1) {
    rangeWithEllipsis.push("...", totalPages);
  } else if (totalPages > 1) {
    rangeWithEllipsis.push(totalPages);
  }

  return rangeWithEllipsis;
}

export { Pagination };
export type { PaginationProps };
