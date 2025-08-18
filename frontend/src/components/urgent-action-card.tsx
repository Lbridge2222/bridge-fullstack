import { cn } from "@/lib/utils";
import React from "react";

interface UrgentActionCardProps {
  name: string;
  type: "Hot Lead" | "Application" | "Offer Response";
  course: string;
  campus: string;
  score: number;
  probability: number;
  action: string;
  value: string;
}

export const UrgentActionCard: React.FC<UrgentActionCardProps> = ({
  name,
  type,
  course,
  campus,
  score,
  probability,
  action,
  value,
}) => {
  const badgeStyles = {
    "Hot Lead": "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    Application: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    "Offer Response": "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  }[type];

return (
  <div className="card-base p-4 interactive-hover">
    <div className="flex items-start justify-between gap-4">
      {/* LEFT SIDE */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-card-foreground">{name}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badgeStyles)}>
            {type}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">{course} • {campus}</div>
        <div className="text-xs font-medium text-primary">{action}</div>
      </div>

      {/* RIGHT SIDE */}
      <div className="text-right space-y-1 text-xs shrink-0">
        <div>
          <span className="text-muted-foreground">AI:</span>{" "}
          <span className="text-card-foreground font-semibold">{score}</span>
        </div>
        <div className="text-muted-foreground">{probability}%</div>
        <div className="text-green-600 dark:text-green-400 font-semibold">{value}</div>
      </div>
    </div>
  </div>
);
};