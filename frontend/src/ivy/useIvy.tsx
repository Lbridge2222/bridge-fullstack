// src/ivy/useIvy.tsx
// Hook to mount Ask Ivy palette and bind ⌘K

import * as React from "react";
import { IvyPalette } from "./IvyPalette";
import { contactRegistry } from "./contactRegistry";
import type { IvyContext } from "./types";

export function useIvy() {
  const [open, setOpen] = React.useState(false);
  const [context, setContext] = React.useState<IvyContext>({});

  // Bind ⌘K to open palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Create the overlay component
  const IvyOverlay = React.useCallback(
    () => {
      return (
        <IvyPalette 
          open={open} 
          onOpenChange={setOpen} 
          context={context} 
          commands={contactRegistry} 
        />
      );
    },
    [open, context]
  );

  return {
    // Open palette programmatically
    openIvy: (newContext?: Partial<IvyContext>) => {
      if (newContext) {
        setContext(prev => ({ ...prev, ...newContext }));
      }
      setOpen(true);
    },
    
    // Update context (for when person data changes)
    setIvyContext: setContext,
    
    // Overlay component to render
    IvyOverlay,
    
    // Current state
    isOpen: open,
    context
  };
}
