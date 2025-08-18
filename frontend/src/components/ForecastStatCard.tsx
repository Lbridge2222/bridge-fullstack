// ForecastStatCard.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ForecastStatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  footnote?: string;
  color?: "purple" | "green" | "orange" | "blue";
}

export const ForecastStatCard: React.FC<ForecastStatCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  footnote,
  color = "purple"
}) => {
  const colorMap = {
    purple: "from-purple-50 to-blue-50 border-purple-200",
    green: "from-green-50 to-emerald-50 border-green-200",
    orange: "from-orange-50 to-red-50 border-orange-200",
    blue: "from-blue-50 to-indigo-50 border-blue-200",
  };

  return (
    <div className={cn(
      "p-6 rounded-lg border bg-gradient-to-br",
      colorMap[color]
    )}>
      <div className="flex items-center gap-2 mb-3 text-gray-900">
        <div className={`text-${color}-600`}>{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      {subtitle && <div className={`text-sm text-${color}-600 mb-1`}>{subtitle}</div>}
      {footnote && <div className="text-xs text-gray-600">{footnote}</div>}
    </div>
  );
};