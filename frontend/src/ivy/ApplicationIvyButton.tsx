// src/ivy/ApplicationIvyButton.tsx
// Prominent Ask Ivy button for Applications Board

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApplicationIvyButtonProps {
  onOpenIvy: () => void;
  context: {
    applications?: any[];
    selectedApplications?: string[];
    progressionStats?: {
      total: number;
      avgProgression: number;
      highRisk: number;
    };
  };
}

export function ApplicationIvyButton({ onOpenIvy, context }: ApplicationIvyButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const applicationCount = context.applications?.length || 0;
  const selectedCount = context.selectedApplications?.length || 0;
  const hasSelection = selectedCount > 0;

  return (
    <div>
      {/* Main Ask Ivy Button */}
      <Button
        onClick={onOpenIvy}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative h-10 px-4 bg-gradient-to-r from-primary to-primary/90 
          hover:from-primary/90 hover:to-primary/80 
          text-white font-medium shadow-lg hover:shadow-xl
          transition-all duration-200 transform hover:scale-105
          border-0 rounded-full
        `}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-4 w-4" />
            {isHovered && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </div>
          <span className="hidden sm:inline">Ask Ivy</span>
          <span className="sm:hidden">AI</span>
        </div>
        
        {/* Context badges */}
        {applicationCount > 0 && (
          <Badge 
            variant="secondary" 
            className="ml-2 bg-white/20 text-white border-white/30 text-xs px-2 py-0.5"
          >
            {applicationCount}
          </Badge>
        )}
        
        {hasSelection && (
          <Badge 
            variant="secondary" 
            className="ml-1 bg-blue-500/20 text-blue-100 border-blue-400/30 text-xs px-2 py-0.5"
          >
            {selectedCount} selected
          </Badge>
        )}
      </Button>

    </div>
  );
}
