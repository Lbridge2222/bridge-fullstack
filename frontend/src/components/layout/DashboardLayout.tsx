// src/components/layout/DashboardLayout.tsx
import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, ChevronLeft } from "lucide-react";
import { NAVIGATION } from "@/config/navigation"
import type { NavLeaf, NavSubSection, NavNode } from "@/config/navigation"

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = React.useState<string[]>(["CRM"]);
  const [expandedSubSections, setExpandedSubSections] = React.useState<string[]>(["Application to Enrollment"]);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const currentPath = location.pathname;

  const isActiveHref = (href?: string) =>
    !!href && (currentPath === href || currentPath.startsWith(href + "/"));

  const toggleSection = (title: string) =>
    setExpandedSections((prev) => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);

  const toggleSubSection = (title: string) =>
    setExpandedSubSections((prev) => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);

  // shared renderers
  const renderNavItem = (item: NavLeaf | NavSubSection, level = 0) => {
    const hasChildren = "children" in item && !!item.children?.length;
    const expanded = hasChildren && expandedSubSections.includes(item.title);
    const active = isActiveHref((item as NavLeaf).href);

    const paddingClass = level === 0 ? "mx-3" : "mx-6";
    const base =
      `flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 relative group ${paddingClass} ` +
      (active ? "bg-slate-100 text-slate-800 border-l-4 border-slate-400" : "hover:bg-slate-200 text-slate-700 hover:border-l-4 hover:border-slate-500");

    return (
      <div key={item.title}>
        <div
          className={base}
          onClick={() => {
            if (hasChildren) {
              toggleSubSection(item.title);
            } else if ((item as NavLeaf).href) {
              // Check if the route actually exists
              if ((item as NavLeaf).href === '/dashboard' || 
                  (item as NavLeaf).href === '/crm/overview' || 
                  (item as NavLeaf).href === '/crm/leads' ||
                  (item as NavLeaf).href === '/crm/enquiries' ||
                  (item as NavLeaf).href === '/crm/interviews' ||
                  (item as NavLeaf).href === '/crm/applications' ||
                  (item as NavLeaf).href === '/crm/offers' ||
                  (item as NavLeaf).href === '/students/overview' ||
                  (item as NavLeaf).href === '/communications/emails' ||
                  (item as NavLeaf).href === '/communications/sms' ||
                  (item as NavLeaf).href === '/communications/calls' ||
                  (item as NavLeaf).href === '/workflows/workflowstudio' ||
                  (item as NavLeaf).href === '/workflows/integrations' ||
                  (item as NavLeaf).href === '/ai/forecasting' ||
                  (item as NavLeaf).href === '/ai/riskscoring' ||
                  (item as NavLeaf).href === '/ai/ai-comms' ||
                  (item as NavLeaf).href === '/ai/actions' ||
                  (item as NavLeaf).href === '/ai/natural-language' ||
                  (item as NavLeaf).href === '/ai/advanced-ml' ||
                  (item as NavLeaf).href === '/ai/communications' ||
                  (item as NavLeaf).href === '/analytics/cohort-analysis') {
                navigate((item as NavLeaf).href!);
              } else {
                // Show placeholder for routes without pages
                alert(`🚧 ${item.title} page is coming soon!\n\nThis feature is currently under development.`);
              }
            }
          }}
        >
          <item.icon size={16} className={`${active ? "text-slate-700 bg-slate-200" : "text-slate-500 bg-slate-100"} p-1 rounded-md flex-shrink-0`} />
          <span className="flex-1 font-medium">{item.title}</span>

          {"badge" in item && (item as NavLeaf).badge ? (
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
              {(item as NavLeaf).badge}
            </span>
          ) : null}

          {hasChildren && (
            <div className={`${active ? "text-slate-600" : "text-slate-400"} transition-transform duration-200`}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
        </div>

        {hasChildren && expanded && (
          <div className="mt-1 mb-2">
            {(item as NavSubSection).children!.map((sub) => renderNavItem(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-80'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className={`${sidebarCollapsed ? 'px-4 py-5' : 'px-6 py-5'} border-b border-slate-200 relative`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">I</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-semibold text-slate-900">IVY</h1>
                <p className="text-xs text-slate-500">Higher Education OS</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`${sidebarCollapsed ? 'absolute -right-3 top-1/2 -translate-y-1/2' : 'ml-auto'} w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center transition-colors shadow-sm`}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={14} className="text-slate-600" /> : <ChevronLeft size={14} className="text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-2">
            {NAVIGATION.map((section: NavNode, index: number) => {
              const hasChildren = !!section.children?.length;
              const expanded = expandedSections.includes(section.title);
              const isDirectlyActive = isActiveHref(section.href);
              const isParentOfActive = hasChildren && section.children!.some(child => {
                if ('href' in child && child.href) {
                  return isActiveHref(child.href);
                }
                if ('children' in child && child.children) {
                  return child.children.some(subChild => 'href' in subChild && isActiveHref(subChild.href));
                }
                return false;
              });
              // Only highlight one item at a time - prioritize direct active, then parent of active
              const active = isDirectlyActive || (isParentOfActive && !isDirectlyActive);

              return (
                <div key={section.title}>
                  {index > 0 && <div className="h-px bg-slate-200 mx-6 my-3" />}
                  <div
                    className={`flex items-center gap-3 px-6 py-4 text-sm cursor-pointer transition-all duration-200 rounded-lg mx-3 relative group ${
                      active 
                        ? "bg-slate-100 text-slate-800 border-l-4 border-slate-400" 
                        : "hover:bg-slate-200 text-slate-700 hover:border-l-4 hover:border-slate-500"
                    } ${sidebarCollapsed ? 'justify-center px-2 mx-2' : ''}`}
                    onClick={() => {
                      if (hasChildren) {
                        if (sidebarCollapsed) {
                          // When collapsed, expand the sidebar first
                          setSidebarCollapsed(false);
                        } else {
                          // When expanded, toggle the section
                          toggleSection(section.title);
                        }
                      } else if (section.href) {
                        // Check if the route actually exists
                        if (section.href === '/dashboard' || 
                            section.href === '/crm/overview' || 
                            section.href === '/crm/leads' ||
                            section.href === '/crm/enquiries' ||
                            section.href === '/crm/interviews' ||
                            section.href === '/crm/applications' ||
                            section.href === '/crm/offers' ||
                            section.href === '/students/overview' ||
                            section.href === '/communications/emails' ||
                            section.href === '/communications/sms' ||
                            section.href === '/communications/calls' ||
                            section.href === '/workflows/workflowstudio' ||
                            section.href === '/workflows/integrations' ||
                            section.href === '/ai/forecasting' ||
                            section.href === '/ai/riskscoring' ||
                            section.href === '/ai/ai-comms' ||
                            section.href === '/ai/actions' ||
                            section.href === '/ai/natural-language' ||
        section.href === '/ai/advanced-ml' ||
                            section.href === '/ai/communications' ||
                            section.href === '/analytics/cohort-analysis') {
                          navigate(section.href);
                        } else {
                          // Show placeholder for routes without pages
                          alert(`🚧 ${section.title} page is coming soon!\n\nThis feature is currently under development.`);
                        }
                      }
                    }}
                    title={sidebarCollapsed ? section.title : undefined}
                  >
                    {active && !sidebarCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-slate-400 rounded-r-full" />
                    )}
                    <section.icon size={20} className={`${
                      active 
                        ? "text-slate-700 bg-slate-200" 
                        : "text-slate-500 bg-slate-100"
                    } p-1 rounded-md flex-shrink-0`} />
                    {!sidebarCollapsed && (
                      <div className="flex-1">
                        <div className="font-medium">{section.title}</div>
                      </div>
                    )}
                  </div>

                  {hasChildren && !sidebarCollapsed && (
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}>
                      <div className="pb-2">{section.children!.map((c) => renderNavItem(c))}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className={`${sidebarCollapsed ? 'px-2' : 'p-4'} border-t border-slate-200`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">SW</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">Sarah Wilson</div>
                <div className="text-xs text-slate-500 truncate">Admissions Manager</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Routed page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}