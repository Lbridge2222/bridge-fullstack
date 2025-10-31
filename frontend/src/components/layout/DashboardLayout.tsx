// src/components/layout/DashboardLayout.tsx
import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, GraduationCap } from "lucide-react";
import { NAVIGATION } from "@/config/navigation"
import type { NavLeaf, NavSubSection, NavNode } from "@/config/navigation"
import { Separator } from "@/components/ui/separator"
import { NavLink } from "@/components/ui/nav-link"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = React.useRef<HTMLDivElement | null>(null);
  const closeHoverTimer = React.useRef<number | null>(null);
  const [expandedSections, setExpandedSections] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("nav.expandedSections");
      return raw ? JSON.parse(raw) : ["CRM"];
    } catch {
      return ["CRM"];
    }
  });
  const [expandedSubSections, setExpandedSubSections] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("nav.expandedSubSections");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [manuallyCollapsedSections, setManuallyCollapsedSections] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("nav.manuallyCollapsedSections");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("nav.sidebarCollapsed");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });
  const [compact, setCompact] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("nav.compact");
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });
  const [hoveredSection, setHoveredSection] = React.useState<string | null>(null);
  const [lastVisitedBySection, setLastVisitedBySection] = React.useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem("nav.lastVisited");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const currentPath = location.pathname;

  const isActiveHref = (href?: string) =>
    !!href && (currentPath === href || currentPath.startsWith(href + "/"));

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const isCurrentlyOpen = prev.includes(title);
      
      // If currently open (manually), close it
      if (isCurrentlyOpen) {
        const next = prev.filter(item => item !== title);
        // Mark as manually collapsed (to override auto-expansion)
        setManuallyCollapsedSections(collapsed => [...collapsed.filter(t => t !== title), title]);
        try { localStorage.setItem("nav.expandedSections", JSON.stringify(next)); } catch {}
        return next;
      } else {
        // If not currently open, open it and close others
        const next = [title];
        // Clear all manually collapsed states when opening a different section
        setManuallyCollapsedSections([]);
        try { localStorage.setItem("nav.expandedSections", JSON.stringify(next)); } catch {}
        return next;
      }
    });
  };

  const toggleSubSection = (title: string) =>
    setExpandedSubSections((prev) => {
      const isCurrentlyOpen = prev.includes(title);
      const next = isCurrentlyOpen 
        ? prev.filter(item => item !== title)  // Remove if currently open
        : [...prev, title];                    // Add if currently closed
      try { localStorage.setItem("nav.expandedSubSections", JSON.stringify(next)); } catch {}
      return next;
    });

  React.useEffect(() => {
    try { localStorage.setItem("nav.sidebarCollapsed", JSON.stringify(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  React.useEffect(() => {
    try { localStorage.setItem("nav.manuallyCollapsedSections", JSON.stringify(manuallyCollapsedSections)); } catch {}
  }, [manuallyCollapsedSections]);

  React.useEffect(() => {
    try { localStorage.setItem("nav.compact", JSON.stringify(compact)); } catch {}
  }, [compact]);

  // Keyboard shortcuts: ⌘N (New Application)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/admissions/applications/new');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Track last visited leaf per top-level section
  React.useEffect(() => {
    // identify section + leaf for currentPath
    const find = () => {
      for (const section of NAVIGATION) {
        const children = section.children || [];
        for (const child of children) {
          if ('href' in child && child.href && (currentPath === child.href || currentPath.startsWith(child.href + "/"))) {
            return { section: section.title, href: child.href };
          }
          if ('children' in child && child.children) {
            for (const sub of child.children) {
              if ('href' in sub && sub.href && (currentPath === sub.href || currentPath.startsWith(sub.href + "/"))) {
                return { section: section.title, href: sub.href };
              }
            }
          }
        }
      }
      return null;
    };
    const match = find();
    if (match) {
      setLastVisitedBySection(prev => {
        const next = { ...prev, [match.section]: match.href };
        try { localStorage.setItem("nav.lastVisited", JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [currentPath]);

  // Breadcrumbs from NAVIGATION
  const getBreadcrumbs = React.useCallback((): Array<{ title: string; href?: string }> => {
    // Try to find best match in NAVIGATION based on href prefixes
    for (const section of NAVIGATION) {
      if (section.href && currentPath.startsWith(section.href)) {
        return [{ title: section.title, href: section.href }];
      }
      if (section.children) {
        for (const child of section.children) {
          if ('href' in child && child.href && currentPath.startsWith(child.href)) {
            return [{ title: section.title, href: section.href }, { title: child.title, href: child.href }];
          }
          if ('children' in child && child.children) {
            for (const sub of child.children) {
              if ('href' in sub && sub.href && currentPath.startsWith(sub.href)) {
                return [
                  { title: section.title, href: section.href },
                  { title: child.title },
                  { title: sub.title, href: sub.href },
                ];
              }
            }
          }
        }
      }
    }
    return [];
  }, [currentPath]);

  // shared renderers
  const renderNavItem = (item: NavLeaf | NavSubSection, level = 0) => {
    const hasChildren = "children" in item && !!item.children?.length;
    const expanded = hasChildren && expandedSubSections.includes(item.title);
    const isLeaf = "href" in item && item.href;

    // For leaf items, use NavLink component
    if (isLeaf && !hasChildren) {
      return (
        <div key={item.title} className={cn(sidebarCollapsed ? "flex justify-center" : level === 0 ? "mx-2" : "mx-6")}>
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  href={item.href!}
                  icon={item.icon}
                  iconSize={level === 0 ? 18 : 16}
                  variant={level === 0 ? "primary" : "secondary"}
                  collapsed
                  dense={compact}
                  size="sm"
                  badge={'badge' in item ? (item as NavLeaf).badge : undefined}
                >
                  {item.title}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              href={item.href!}
              icon={item.icon}
              iconSize={level === 0 ? 18 : 16}
              variant={level === 0 ? "primary" : "secondary"}
              dense={compact}
              size={level === 0 ? "md" : "sm"}
              badge={'badge' in item ? (item as NavLeaf).badge : undefined}
            >
              {item.title}
            </NavLink>
          )}
        </div>
      );
    }

    // For parent items with children, use button with expansion logic
    return (
      <div key={item.title}>
        <div className={cn(sidebarCollapsed ? "flex justify-center" : level === 0 ? "mx-2" : "mx-6")}>
          <button
            type="button"
            className={cn(
              "group relative flex items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
              level === 0
                ? (compact ? "px-3 py-2 text-sm font-semibold" : "px-4 py-2.5 text-sm font-semibold")
                : (compact ? "px-3 py-1.5 text-xs font-medium" : "px-4 py-2 text-xs font-medium"),
              sidebarCollapsed ? "justify-center w-10 h-10" : "w-full",
              "text-foreground/90 hover:bg-accent/20 hover:text-foreground"
            )}
            data-rail={!sidebarCollapsed}
            aria-expanded={hasChildren ? expanded : undefined}
            aria-haspopup={hasChildren ? "menu" : undefined}
            onClick={() => {
              if (hasChildren) {
                if (sidebarCollapsed) {
                  setSidebarCollapsed(false);
                } else {
                  toggleSubSection(item.title);
                }
              }
            }}
          >
            {sidebarCollapsed && expanded ? (
              <span className="w-8 h-8 rounded-lg bg-success inline-flex items-center justify-center">
                <item.icon size={level === 0 ? 18 : 16} className="text-success-foreground" />
              </span>
            ) : (
              <item.icon
                size={level === 0 ? 18 : 16}
                className="flex-shrink-0 opacity-80 group-hover:opacity-100 group-hover:translate-x-[1px]"
              />
            )}
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 truncate text-left ml-3">{item.title}</span>
                {hasChildren && (
                  <ChevronRight 
                    size={14} 
                    className={cn(
                      "flex-shrink-0 transition-transform duration-200 opacity-60 group-hover:opacity-100",
                      expanded && "rotate-90"
                    )}
                  />
                )}
              </>
            )}
          </button>
        </div>

        {hasChildren && expanded && !sidebarCollapsed && (
          <div className="mt-1 mb-1.5">
            <div className="ml-2 border-l border-border/60 pl-2 space-y-1">
              {(item as NavSubSection).children!.map((sub) => renderNavItem(sub, level + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Keyboard navigation inside nav
  const handleNavKeyDown = (e: React.KeyboardEvent) => {
    if (!navRef.current) return;
    const focusables = Array.from(
      navRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetParent !== null);
    const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
    const viewport = navRef.current.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');

    if (e.key === 'ArrowDown') {
      if (currentIndex > -1 && currentIndex < focusables.length - 1) {
        e.preventDefault();
        focusables[currentIndex + 1]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      if (currentIndex > 0) {
        e.preventDefault();
        focusables[currentIndex - 1]?.focus();
      }
    } else if (e.key === 'PageDown' && viewport) {
      e.preventDefault();
      viewport.scrollBy({ top: viewport.clientHeight - 32, behavior: 'smooth' });
    } else if (e.key === 'PageUp' && viewport) {
      e.preventDefault();
      viewport.scrollBy({ top: -(viewport.clientHeight - 32), behavior: 'smooth' });
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusables[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      focusables[focusables.length - 1]?.focus();
    } else if (e.key === 'ArrowRight') {
      const target = document.activeElement as HTMLElement | null;
      if (target && target.getAttribute('aria-expanded') !== null) {
        const expanded = target.getAttribute('aria-expanded') === 'true';
        if (!expanded) {
          e.preventDefault();
          target.click();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const target = document.activeElement as HTMLElement | null;
      if (target && target.getAttribute('aria-expanded') !== null) {
        const expanded = target.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          e.preventDefault();
          target.click();
        }
      }
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-card border-r border-border flex flex-col transition-all duration-300`} aria-label="Primary">
        {/* Logo */}
        <div className={`${sidebarCollapsed ? 'px-4 py-4' : 'px-5 py-4'} border-b border-border relative`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 logo-bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
              <GraduationCap size={18} className="text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-semibold text-foreground">IVY</h1>
                <p className="text-xs text-muted-foreground">Higher Education OS</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`${sidebarCollapsed ? 'absolute -right-3 top-1/2 -translate-y-1/2' : 'ml-auto'} w-6 h-6 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center transition-colors shadow-sm`}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={sidebarCollapsed}
            >
              {sidebarCollapsed ? <ChevronRight size={14} className="text-muted-foreground" /> : <ChevronLeft size={14} className="text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={200}>
        <nav ref={navRef} className="flex-1 min-h-0 py-3" aria-label="Primary" onKeyDown={handleNavKeyDown}>
          <ScrollArea className="h-full pr-1" type="always" scrollHideDelay={400}>
          <div className="space-y-0">
            {NAVIGATION.map((section: NavNode, index: number) => {
              const hasChildren = !!section.children?.length;
              // const isDirectlyActive = isActiveHref(section.href); // not used
              const isParentOfActive = hasChildren && section.children!.some(child => {
                if ('href' in child && child.href) {
                  return isActiveHref(child.href);
                }
                if ('children' in child && child.children) {
                  return child.children.some(subChild => 'href' in subChild && isActiveHref(subChild.href));
                }
                return false;
              });
              const manuallyExpanded = expandedSections.includes(section.title);
              const isManuallyCollapsed = manuallyCollapsedSections.includes(section.title);
              const expanded = manuallyExpanded || (isParentOfActive && !isManuallyCollapsed);
              
              return (
                <div key={section.title}>
                  {/* Divider between groups */}
                  {index > 0 && !sidebarCollapsed && (
                    <div className="mt-2 mb-2">
                      <Separator className="mx-3 bg-border/60" />
                    </div>
                  )}
                  
                  {/* Section item */}
                  <div className="mb-1.5">
                    {section.href ? (
                      // Section with direct link
                      <div className={cn(sidebarCollapsed ? "flex justify-center" : "mx-2")}>
                        {sidebarCollapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                          <NavLink
                            href={section.href!}
                            icon={section.icon}
                            iconSize={18}
                            variant="primary"
                            collapsed
                            dense={compact}
                            size="sm"
                          >
                            {section.title}
                          </NavLink>
                            </TooltipTrigger>
                            <TooltipContent side="right">{section.title}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <NavLink
                            href={section.href!}
                            icon={section.icon}
                            iconSize={18}
                            variant="primary"
                            dense={compact}
                            size="md"
                          >
                            {section.title}
                          </NavLink>
                        )}
                      </div>
                    ) : (
                      // Section with children (expandable)
                      <div
                        className={cn(sidebarCollapsed ? "relative flex justify-center" : "mx-2")}
                        onMouseEnter={() => {
                          if (!sidebarCollapsed) return;
                          if (closeHoverTimer.current) window.clearTimeout(closeHoverTimer.current);
                          setHoveredSection(section.title);
                        }}
                        onMouseLeave={() => {
                          if (!sidebarCollapsed) return;
                          if (closeHoverTimer.current) window.clearTimeout(closeHoverTimer.current);
                          closeHoverTimer.current = window.setTimeout(() => {
                            setHoveredSection((prev) => (prev === section.title ? null : prev));
                          }, 250);
                        }}
                      >
                        <DropdownMenu
                          open={sidebarCollapsed && hoveredSection === section.title}
                          onOpenChange={(v) => {
                            if (!sidebarCollapsed) return;
                            if (v) {
                              if (closeHoverTimer.current) window.clearTimeout(closeHoverTimer.current);
                              setHoveredSection(section.title);
                            } else {
                              setHoveredSection((prev) => (prev === section.title ? null : prev));
                            }
                          }}
                          modal={false}
                        >
                          <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "group relative flex items-center rounded-lg transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
                            compact ? "px-3 py-2 text-sm font-semibold" : "px-4 py-2.5 text-sm font-semibold",
                            sidebarCollapsed 
                              ? "justify-center w-10 h-10 px-0" 
                              : "w-full",
                            isParentOfActive
                              ? (sidebarCollapsed
                                  ? "text-foreground"
                                  : "bg-muted/50 text-foreground data-[rail=true]:before:absolute data-[rail=true]:before:left-0 data-[rail=true]:before:top-1.5 data-[rail=true]:before:bottom-1.5 data-[rail=true]:before:w-[3px] data-[rail=true]:before:bg-success")
                              : "text-foreground/90 hover:bg-success/5 hover:text-foreground"
                          )}
                          data-rail={!sidebarCollapsed}
                          aria-controls={`nav-group-${index}`}
                          aria-haspopup={hasChildren ? "menu" : undefined}
                          onClick={() => {
                            if (hasChildren) {
                              if (sidebarCollapsed) {
                                setSidebarCollapsed(false);
                              } else {
                                // Expand first if closed; navigate to last visited only when already expanded
                                if (!expanded) {
                                  toggleSection(section.title);
                                } else {
                                  const last = lastVisitedBySection[section.title];
                                  if (last) navigate(last);
                                }
                              }
                            }
                          }}
                          title={sidebarCollapsed ? section.title : undefined}
                          aria-expanded={hasChildren ? expanded : undefined}
                        >
                          {sidebarCollapsed && (expanded || isParentOfActive) ? (
                            <span className="w-8 h-8 rounded-lg bg-success inline-flex items-center justify-center">
                              <section.icon size={18} className="text-success-foreground" />
                            </span>
                          ) : (
                            <section.icon 
                              size={18} 
                              className={
                                cn(
                                  "flex-shrink-0 opacity-80 group-hover:opacity-100 group-hover:translate-x-[1px]",
                                  sidebarCollapsed && isParentOfActive && "text-success"
                                )
                              }
                            />
                          )}
                          {!sidebarCollapsed && (
                            <>
                              <span className="flex-1 truncate text-left ml-3">{section.title}</span>
                              {hasChildren && (
                                <ChevronRight 
                                  size={14} 
                                  className={cn(
                                    "flex-shrink-0 transition-transform duration-200 opacity-60 group-hover:opacity-100",
                                    expanded && "rotate-90",
                                    (expanded || isParentOfActive) && "text-success"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSection(section.title);
                                  }}
                                />
                              )}
                            </>
                          )}
                        </button>
                          </DropdownMenuTrigger>
                          {sidebarCollapsed && hasChildren && (
                            <DropdownMenuContent
                              align="start"
                              side="right"
                              sideOffset={6}
                              className="min-w-[200px]"
                              onMouseEnter={() => {
                                if (closeHoverTimer.current) window.clearTimeout(closeHoverTimer.current);
                                setHoveredSection(section.title);
                              }}
                              onMouseLeave={() => {
                                if (closeHoverTimer.current) window.clearTimeout(closeHoverTimer.current);
                                closeHoverTimer.current = window.setTimeout(() => {
                                  setHoveredSection((prev) => (prev === section.title ? null : prev));
                                }, 250);
                              }}
                            >
                              {section.children!.map((child) => {
                                if ("href" in child && child.href) {
                                  const LeafIcon = child.icon;
                                  return (
                                    <DropdownMenuItem key={child.title} onSelect={() => navigate(child.href!)}>
                                      <LeafIcon className="mr-2" /> {child.title}
                                    </DropdownMenuItem>
                                  );
                                }
                                if ("children" in child && child.children) {
                                  const SubIcon = child.icon;
                                  return (
                                    <DropdownMenuSub key={child.title}>
                                      <DropdownMenuSubTrigger>
                                        <SubIcon className="mr-2" /> {child.title}
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        {child.children.map((subLeaf) => {
                                          const SubLeafIcon = subLeaf.icon;
                                          return (
                                            <DropdownMenuItem key={subLeaf.title} onSelect={() => navigate(subLeaf.href)}>
                                              <SubLeafIcon className="mr-2" /> {subLeaf.title}
                                            </DropdownMenuItem>
                                          );
                                        })}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                  );
                                }
                                return null;
                              })}
                            </DropdownMenuContent>
                          )}
                        </DropdownMenu>

                        {/* Safe zone buffer between trigger and flyout to reduce accidental closes */}
                        {sidebarCollapsed && (
                          <div
                            className="absolute left-full top-0 h-10 w-3"
                            onMouseEnter={() => {
                              if (closeHoverTimer.current) window.clearTimeout(closeHoverTimer.current);
                              setHoveredSection(section.title);
                            }}
                            onMouseLeave={() => {
                              if (closeHoverTimer.current) window.clearTimeout(closeHoverTimer.current);
                              closeHoverTimer.current = window.setTimeout(() => {
                                setHoveredSection((prev) => (prev === section.title ? null : prev));
                              }, 250);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Children */}
                  {hasChildren && !sidebarCollapsed && (
                    <div
                      id={`nav-group-${index}`}
                      className={cn("overflow-hidden transition-[max-height] duration-150 ease-out", expanded ? "max-h-96" : "max-h-0")}
                    >
                      <div className="mt-1 mb-1.5">
                        <div className="ml-2 border-l border-border/60 pl-2 space-y-1">
                          {section.children!.map((child) => renderNavItem(child, 1))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </ScrollArea>
        </nav>
        </TooltipProvider>

        {/* User */}
        <div className={`${sidebarCollapsed ? 'px-2' : 'p-4'} border-t border-border`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-sm font-medium">SW</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">Sarah Wilson</div>
                <div className="text-xs text-muted-foreground truncate">Admissions Manager</div>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="mt-3 flex items-center justify-between"> 
              <span className="text-xs text-muted-foreground">Compact mode</span>
              <Switch
                checked={compact}
                onCheckedChange={(v) => setCompact(!!v)}
                aria-label="Toggle compact mode"
              />
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Skip to content for accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-3 py-2 rounded">Skip to content</a>
        {/* Routed page content */}
        {/* Top breadcrumb header */}
        <div className="px-6 pt-3 flex items-center justify-between">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex items-center gap-2 flex-wrap">
              {getBreadcrumbs().map((crumb, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  {idx > 0 && <span className="text-slate-400">/</span>}
                  {crumb.href ? (
                    <button type="button" onClick={() => navigate(crumb.href!)} className="hover:text-foreground focus-ring rounded">
                      {crumb.title}
                    </button>
                  ) : (
                    <span className="text-foreground">{crumb.title}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <main id="main-content" className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
