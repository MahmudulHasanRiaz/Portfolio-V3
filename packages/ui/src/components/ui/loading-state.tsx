"use client";

import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";
import { Skeleton } from "./skeleton";

interface LoadingStateProps {
  variant?: "spinner" | "skeleton";
  count?: number;
  className?: string;
}

function LoadingState({
  variant = "spinner",
  count = 3,
  className,
}: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-12",
          className
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { LoadingState };
export type { LoadingStateProps };
