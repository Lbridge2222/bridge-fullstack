import React from "react";
import { cn } from "@/lib/utils";

export interface AIInsightCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  impact: string;
  type?: "urgent" | "opportunity" | "risk" | "success";
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  icon,
  title,
  description,
  action,
  impact,
  type = "opportunity",
}) => {
  const typeStyles = {
    urgent: {
      icon: "text-destructive",
      impact: "text-destructive",
      button: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    },
    opportunity: {
      icon: "text-green-600 dark:text-green-400",
      impact: "text-green-600 dark:text-green-400",
      button: "bg-primary text-primary-foreground hover:bg-primary/90"
    },
    risk: {
      icon: "text-yellow-600 dark:text-yellow-500",
      impact: "text-yellow-600 dark:text-yellow-500",
      button: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    },
    success: {
      icon: "text-blue-600 dark:text-blue-400",
      impact: "text-blue-600 dark:text-blue-400",
      button: "bg-accent text-accent-foreground hover:bg-accent/90"
    },
  } as const;

  const styles = typeStyles[type];

  return (
    <div className="card-elevated p-4 interactive-hover">
      <div className="flex items-start gap-4">
        <div className={cn("mt-0.5", styles.icon)}>{icon}</div>
        <div className="flex-1">
          <h4 className="font-medium text-card-foreground mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-medium", styles.impact)}>{impact}</span>
            <button className={cn("px-3 py-1 text-xs rounded-md transition-colors", styles.button)}>
              {action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};