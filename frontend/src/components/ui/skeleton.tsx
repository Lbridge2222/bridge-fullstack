import * as React from "react";
import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: DivProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3 w-full", i === lines - 1 ? "w-5/6" : "")} />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Skeleton
      className={cn("rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
}

