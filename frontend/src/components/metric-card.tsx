// components/metric-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  subtitle?: string;
  color?: "blue" | "green" | "purple" | "orange";
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  subtitle,
  color = "blue"
}) => {
  const getChangeIcon = () => {
    if (change! > 0) return <ArrowUp className="text-green-600" size={16} />;
    if (change! < 0) return <ArrowDown className="text-red-600" size={16} />;
    return <Minus className="text-gray-400" size={16} />;
  };

  const getChangeColor = () => {
    if (change! > 0) return "text-green-600";
    if (change! < 0) return "text-red-600";
    return "text-gray-500";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-${color}-100 rounded-lg`}>{icon}</div>
          <div>
            <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="text-sm font-medium">{Math.abs(change || 0)}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">vs last cycle</p>
        </div>
      </CardHeader>
      <CardContent />
    </Card>
  );
};