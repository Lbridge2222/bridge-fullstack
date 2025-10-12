# Modal Implementation Guide

## Overview
This document describes the working implementation of floating modals (EmailComposer, CallConsole, MeetingBooker) on the Applications Board, established through debugging and fixes in this chat session.

## Key Components

### 1. Applications Board (`ApplicationsBoard.tsx`)
- **Location**: `frontend/src/components/Dashboard/CRM/ApplicationsBoard.tsx`
- **Key Changes**: Removed `forceFullscreen={true}` from all modals to enable floating behavior
- **Data Mapping**: Fixed foreign key constraint by mapping `app.person_id` instead of `app.application_id` for lead data

```tsx
// Applications Board Modal Usage
<EmailComposer
  isOpen={showEmailComposer}
  onClose={() => setShowEmailComposer(false)}
  lead={emailLead}
  // NO forceFullscreen prop - allows floating behavior
/>

<CallConsole
  isOpen={showCallConsole}
  onClose={() => setShowCallConsole(false)}
  lead={callLead}
  // NO forceFullscreen prop - allows floating behavior
/>

<MeetingBooker
  isOpen={showMeetingBooker}
  onClose={() => setShowMeetingBooker(false)}
  lead={meetingLead}
  // NO forceFullscreen prop - allows floating behavior
/>
```

### 2. EmailComposer (`EmailComposer.tsx`)
- **Location**: `frontend/src/components/EmailComposer.tsx`
- **Key Features**: Floating modal with drag/resize, proper scrolling, centered positioning

#### Critical Implementation Details:

**Initial Positioning:**
```tsx
// Calculate initial position and size
const viewport = getViewportDimensions();
const initialX = Math.max(20, Math.min(viewport.width - 820, viewport.width - 900));
const initialY = Math.max(20, Math.min(viewport.height - 420, (viewport.height - 400) / 2));
const initialWidth = Math.min(800, viewport.width - 40);
const initialHeight = Math.max(400, Math.min(600, Math.round(viewport.height * 0.7)));
```

**Window Resize Handler:**
```tsx
useEffect(() => {
  const handleResize = () => {
    const newViewport = getViewportDimensions();
    const newX = Math.max(20, Math.min(newViewport.width - 820, newViewport.width - 900));
    const newY = Math.max(20, Math.min(position.y, newViewport.height - 200));
    const newWidth = Math.min(800, newViewport.width - 40);
    const newHeight = Math.max(400, Math.min(600, Math.round(newViewport.height * 0.7)));
    
    setPosition(prev => ({
      x: Math.min(prev.x, newX),
      y: Math.min(prev.y, newY)
    }));
    setSize(prev => ({
      width: Math.min(prev.width, newWidth),
      height: Math.min(prev.height, newHeight)
    }));
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []); // Empty dependency array - key to preventing auto-resize
```

**Scrolling Implementation:**
```tsx
// Main container with overflow hidden
<div className="flex h-full overflow-hidden">
  {/* Left sidebar with scroll */}
  <div className="w-80 border-r bg-muted/50 overflow-y-auto h-full">
    {/* Content */}
  </div>
  
  {/* Right content with scroll */}
  <div className="flex-1 overflow-y-auto h-full">
    {/* Content */}
  </div>
</div>
```

### 3. CallConsole (`CallConsole.tsx`)
- **Location**: `frontend/src/components/CallConsole.tsx`
- **Key Features**: Floating modal with drag/resize, dropdown z-index fixes

#### Critical Implementation Details:

**Initial Positioning with useLayoutEffect:**
```tsx
useLayoutEffect(() => {
  if (!isOpen) return;
  const el = containerRef.current;
  const safeTop = getSafeTop();
  const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
  const maxHeight = Math.max(300, window.innerHeight - safeTop - SAFE_MARGIN);

  // Prefer initial center positioning on open
  let width = Math.min(sizeLiveRef.current.width, maxWidth);
  let height = Math.min(sizeLiveRef.current.height, maxHeight);
  sizeLiveRef.current = { width, height };
  setSize(sizeLiveRef.current);

  // Center by default; slight vertical offset
  let x = Math.round((window.innerWidth - width) / 2);
  let y = Math.round(Math.max(safeTop + 24, (window.innerHeight - height) / 3));
  positionRef.current = { x, y };
  setPosition(positionRef.current);

  if (el) {
    el.style.transition = 'none';
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.setProperty('--lane-a-width', `${computeLaneAWidth(width)}px`);
  }

  requestAnimationFrame(() => {
    if (el) el.style.transition = '';
  });
}, [isOpen, effectiveConsoleMode, getSafeTop, computeLaneAWidth]);
```

**Window Resize Handler:**
```tsx
useEffect(() => {
  const handleResize = () => {
    const safeTop = getSafeTop();
    const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
    const maxHeight = Math.max(300, window.innerHeight - safeTop - SAFE_MARGIN);
    let width = Math.min(sizeLiveRef.current.width, maxWidth);
    let height = Math.min(sizeLiveRef.current.height, maxHeight);
    sizeLiveRef.current = { width, height };
    setSize(sizeLiveRef.current);
    // ... position clamping logic
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [getSafeTop, computeLaneAWidth]);
```

**Dropdown Z-Index Fix:**
```tsx
// In LaneA.tsx - all SelectContent components need high z-index
<SelectContent className="z-[60]">
  {/* dropdown items */}
</SelectContent>
```

### 4. MeetingBooker (`MeetingBooker.tsx`)
- **Location**: `frontend/src/components/MeetingBooker.tsx`
- **Key Features**: Floating modal with drag/resize, no auto-resize on open

#### Critical Implementation Details:

**Initial Positioning with useLayoutEffect (Prevents Auto-Resize):**
```tsx
useLayoutEffect(() => {
  if (!isOpen || effectiveMode !== "floating") return;
  const el = containerRef.current;
  if (!el) return;
  
  const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
  const maxHeight = Math.max(300, window.innerHeight - SAFE_MARGIN * 2);

  // Ensure size is within bounds
  let width = Math.min(sizeLiveRef.current.width, maxWidth);
  let height = Math.min(sizeLiveRef.current.height, maxHeight);
  sizeLiveRef.current = { width, height };
  setSize(sizeLiveRef.current);

  // Center by default with new bounds
  const { minX, maxX, minY, maxY } = getClampBounds(width, height);
  let x = Math.round((window.innerWidth - width) / 2);
  let y = Math.round((window.innerHeight - height) / 2);
  x = Math.min(Math.max(x, minX), maxX);
  y = Math.min(Math.max(y, minY), maxY);
  positionRef.current = { x, y };
  setPosition(positionRef.current);

  // Apply positioning directly
  el.style.transition = 'none';
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.zIndex = '40';

  // Re-enable transitions after first paint
  requestAnimationFrame(() => {
    if (el) el.style.transition = '';
  });
}, [isOpen, effectiveMode, getClampBounds]);
```

**Window Resize Handler (Using Refs):**
```tsx
useEffect(() => {
  const handleResize = () => {
    if (!containerRef.current) return;

    // keep size within viewport minus margins
    const maxW = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
    const maxH = Math.max(300, window.innerHeight - SAFE_MARGIN * 2);
    const newSize = {
      width: Math.min(sizeLiveRef.current.width, maxW),
      height: Math.min(sizeLiveRef.current.height, maxH),
    };
    
    // Only update size if it actually changed
    if (newSize.width !== sizeLiveRef.current.width || newSize.height !== sizeLiveRef.current.height) {
      sizeLiveRef.current = newSize;
      setSize(newSize);

      // clamp position with updated size
      const { minX, maxX, minY, maxY } = getClampBounds(newSize.width, newSize.height);
      const newPosition = {
        x: Math.min(Math.max(positionRef.current.x, minX), maxX),
        y: Math.min(Math.max(positionRef.current.y, minY), maxY),
      };
      positionRef.current = newPosition;
      setPosition(newPosition);
    }
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []); // Empty dependency array - key to preventing auto-resize
```

## Key Patterns for Working Modals

### 1. No forceFullscreen Prop
- **Critical**: Never use `forceFullscreen={true}` on Applications Board
- **Result**: Allows floating, draggable behavior

### 2. Empty Dependency Arrays for Resize Effects
- **Pattern**: `useEffect(() => { ... }, [])`
- **Purpose**: Prevents auto-resize on modal open
- **Used in**: All three modals

### 3. useLayoutEffect for Initial Positioning
- **Pattern**: `useLayoutEffect(() => { ... }, [isOpen, ...])`
- **Purpose**: Sets correct position/size before first paint
- **Prevents**: Visual jumping or auto-resize

### 4. Refs for State Management
- **Pattern**: `sizeLiveRef.current`, `positionRef.current`
- **Purpose**: Avoids re-render loops in resize handlers
- **Used in**: CallConsole and MeetingBooker

### 5. Proper Z-Index Management
- **Modal z-index**: `40` (CallConsole, MeetingBooker)
- **Dropdown z-index**: `60` (CallConsole dropdowns)
- **Purpose**: Ensures dropdowns appear above modals

### 6. Scrolling Implementation
- **Container**: `overflow-hidden` on main container
- **Content Areas**: `overflow-y-auto h-full` on scrollable sections
- **Purpose**: Independent scrolling within modal sections

## Common Issues and Solutions

### Issue: Modals not visible
- **Cause**: `forceFullscreen={true}` or incorrect positioning
- **Solution**: Remove `forceFullscreen` prop, check positioning logic

### Issue: Auto-resize on open
- **Cause**: Resize effect with state dependencies
- **Solution**: Use empty dependency array `[]` and refs for state

### Issue: Dropdowns behind modal
- **Cause**: Z-index conflicts
- **Solution**: Set dropdown z-index higher than modal z-index

### Issue: Scrolling not working
- **Cause**: Missing height constraints or overflow settings
- **Solution**: Add `h-full` and `overflow-y-auto` to content areas

### Issue: Foreign key constraint errors
- **Cause**: Wrong ID mapping in Applications Board
- **Solution**: Use `app.person_id` instead of `app.application_id`

## Testing Checklist

1. **Modal Opens**: All three modals open when buttons clicked
2. **No Auto-Resize**: Modals open at consistent size, no resizing
3. **Drag Works**: All modals can be dragged around screen
4. **Resize Works**: All modals can be resized by dragging edges
5. **Scrolling Works**: Content scrolls within modal sections
6. **Dropdowns Work**: CallConsole dropdowns appear above modal
7. **Data Loading**: Lead data loads correctly in all modals
8. **Window Resize**: Modals stay in bounds when window resized

## File Locations

- **Applications Board**: `frontend/src/components/Dashboard/CRM/ApplicationsBoard.tsx`
- **EmailComposer**: `frontend/src/components/EmailComposer.tsx`
- **CallConsole**: `frontend/src/components/CallConsole.tsx`
- **MeetingBooker**: `frontend/src/components/MeetingBooker.tsx`
- **CallConsole LaneA**: `frontend/src/components/CallConsole/LaneA.tsx`

## Last Updated
Created: October 6, 2025
Status: All modals working correctly on Applications Board

