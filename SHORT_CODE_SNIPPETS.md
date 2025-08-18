// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}", // 🔥 ADD THIS - Include Storybook files
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")],

  extend: {
  fontFamily: {
    sans: ['Satoshi', 'sans-serif'],
  },
},

}{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"]
    }
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border bg-white text-card-foreground shadow", className)}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };import React from "react";
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
  const colorMap = {
    urgent: "red",
    opportunity: "green",
    risk: "orange",
    success: "blue",
  } as const;

  const color = colorMap[type];

  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
      <div className={`mt-0.5 text-${color}-600`}>{icon}</div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-600 font-medium">{impact}</span>
          <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700">
            {action}
          </button>
        </div>
      </div>
    </div>
  );
};import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
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
  const badgeClass = {
    "Hot Lead": "bg-red-100 text-red-800",
    Application: "bg-blue-100 text-blue-800",
    "Offer Response": "bg-orange-100 text-orange-800",
  }[type];

return (
  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="flex items-start justify-between gap-4">
      {/* LEFT SIDE */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900">{name}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badgeClass)}>
            {type}
          </span>
        </div>
        <div className="text-xs text-gray-600">{course} • {campus}</div>
        <div className="text-xs font-medium text-blue-600">{action}</div>
      </div>

      {/* RIGHT SIDE */}
      <div className="text-right space-y-1 text-xs shrink-0">
        <div>
          <span className="text-gray-500">AI:</span>{" "}
          <span className="text-gray-900 font-semibold">{score}</span>
        </div>
        <div className="text-gray-500">{probability}%</div>
        <div className="text-green-600 font-semibold">{value}</div>
      </div>
    </div>
  </div>
);
};// components/metric-card.tsx
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
};type StatCardProps = {
  title: string
  value: string | number
  icon?: React.ReactNode
}

// 🔥 CHANGE: Use named export instead of default export
export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      {icon && <div className="text-gray-400">{icon}</div>}
    </div>
  )
}

// Keep default export for backwards compatibility
export default StatCard;// ForecastStatCard.tsx
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
};import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border bg-white text-card-foreground shadow", className)}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };import React from "react";
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
  const colorMap = {
    urgent: "red",
    opportunity: "green",
    risk: "orange",
    success: "blue",
  } as const;

  const color = colorMap[type];

  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
      <div className={`mt-0.5 text-${color}-600`}>{icon}</div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-600 mb-2">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-green-600 font-medium">{impact}</span>
          <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700">
            {action}
          </button>
        </div>
      </div>
    </div>
  );
};import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
