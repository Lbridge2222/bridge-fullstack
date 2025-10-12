import * as React from "react"
import { NavLink as RRNavLink } from "react-router-dom"
import type { NavLinkRenderProps } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { IconType } from "@/config/navigation"

type Props = {
  href: string;
  icon: IconType;
  children: React.ReactNode;
  collapsed?: boolean;
  iconSize?: number;
  badge?: number;
  variant?: "primary" | "secondary";
  size?: "md" | "sm";
  dense?: boolean;
};

export function NavLink({
  href,
  icon: Icon,
  children,
  collapsed,
  iconSize = 18,
  badge,
  variant = "primary",
  size = "md",
  dense = false,
}: Props) {
  return (
    <RRNavLink
      to={href}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
          collapsed ? "justify-center w-10 h-10" : "w-full",
          size === "md"
            ? cn(dense ? "px-3 py-2 text-sm font-semibold" : "px-4 py-2.5 text-sm font-semibold")
            : cn(dense ? "px-3 py-1.5 text-xs font-medium" : "px-4 py-2 text-xs font-medium"),
          variant === "primary"
            ? cn(
                isActive
                  ? (collapsed
                      ? "text-success"
                      : "bg-success text-success-foreground data-[rail=true]:before:absolute data-[rail=true]:before:left-0 data-[rail=true]:before:top-1.5 data-[rail=true]:before:bottom-1.5 data-[rail=true]:before:w-[3px] data-[rail=true]:before:bg-success")
                  : "text-foreground/90 hover:bg-success/5 hover:text-foreground"
              )
            : cn(
                isActive
                  ? (collapsed
                      ? "text-success"
                      : "bg-success text-success-foreground data-[rail=true]:before:absolute data-[rail=true]:before:left-0 data-[rail=true]:before:top-1.5 data-[rail=true]:before:bottom-1.5 data-[rail=true]:before:w-[3px] data-[rail=true]:before:bg-success/90")
                  : "text-foreground/80 hover:bg-success/5 hover:text-foreground"
              )
        )
      }
      data-rail={!collapsed}
    >
      {({ isActive }: NavLinkRenderProps) => (
        <>
          <span
            className={cn(
              "flex-shrink-0 inline-flex items-center justify-center",
              collapsed ? (isActive ? "w-8 h-8 rounded-lg bg-success" : "") : "mr-3 w-5"
            )}
          >
            <Icon
              size={iconSize}
              className={cn(
                "opacity-80 transition-transform group-hover:translate-x-[1px] group-hover:opacity-100",
                isActive && !collapsed && "opacity-100",
                collapsed && isActive && "text-success-foreground"
              )}
            />
          </span>

          {!collapsed && (
            <span className="flex-1 truncate">
              {children}
            </span>
          )}

          {!collapsed && typeof badge === "number" && badge > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted text-xs text-foreground/80 px-1.5">
              {badge}
            </span>
          )}
        </>
      )}
    </RRNavLink>
  );
}
