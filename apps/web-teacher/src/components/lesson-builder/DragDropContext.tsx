'use client';

/**
 * Drag and Drop Context for Lesson Builder
 *
 * Provides drag-and-drop functionality using @dnd-kit
 * Features:
 * - Custom drag preview
 * - Drop validation
 * - Accessible drag-and-drop
 */

import React from 'react';
import { DndContext as DndKitContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface DragDropContextProps {
  children: React.ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragCancel?: () => void;
  renderDragOverlay?: (activeId: string | null) => React.ReactNode;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function DragDropContext({
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
  renderDragOverlay,
}: DragDropContextProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    // Pointer sensor (mouse and touch)
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 8px of movement before dragging starts
        // This prevents accidental drags when clicking
        distance: 8,
      },
    }),
    // Keyboard sensor for accessibility
    useSensor(KeyboardSensor, {
      // Custom coordinate getter for keyboard navigation
      coordinateGetter: (event, { context }) => {
        if (!context.active) return null;

        const { code } = event;
        const { currentCoordinates } = context;

        if (!currentCoordinates) return null;

        const delta = 20; // Move 20px per keypress

        switch (code) {
          case 'ArrowUp':
            return {
              ...currentCoordinates,
              y: currentCoordinates.y - delta,
            };
          case 'ArrowDown':
            return {
              ...currentCoordinates,
              y: currentCoordinates.y + delta,
            };
          default:
            return null;
        }
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    onDragStart?.(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    onDragOver?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    onDragEnd?.(event);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    onDragCancel?.();
  };

  return (
    <DndKitContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      {children}

      {/* Drag Overlay - shown while dragging */}
      <DragOverlay>
        {activeId && renderDragOverlay ? (
          renderDragOverlay(activeId)
        ) : (
          <DefaultDragOverlay activeId={activeId} />
        )}
      </DragOverlay>
    </DndKitContext>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT DRAG OVERLAY
// ════════════════════════════════════════════════════════════════════════════

function DefaultDragOverlay({ activeId }: { activeId: string | null }) {
  if (!activeId) return null;

  return (
    <div className="rounded-lg border-2 border-primary bg-white p-4 shadow-xl">
      <div className="text-sm font-medium">Dragging...</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DRAG HANDLE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Reusable drag handle component
 * Use this to mark an element as draggable
 */
export function DragHandle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`cursor-grab touch-none active:cursor-grabbing ${className || ''}`}
      {...props}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DROPPABLE AREA COMPONENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Reusable droppable area component
 * Use this to mark an area where items can be dropped
 */
interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isOver?: boolean;
}

export function DroppableArea({ id, children, className, isOver }: DroppableAreaProps) {
  return (
    <div
      id={id}
      className={`transition-colors ${isOver ? 'bg-primary/10' : ''} ${className || ''}`}
    >
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Helper to determine if an item is being dragged
 */
export function isDragging(id: string, activeId: string | null): boolean {
  return activeId === id;
}

/**
 * Helper to determine if an item is a valid drop target
 */
export function isValidDropTarget(
  source: { id: string; type: string },
  target: { id: string; type: string }
): boolean {
  // Prevent dropping on itself
  if (source.id === target.id) return false;

  // Add custom validation logic here
  // For example, only allow certain types to be dropped on certain areas
  return true;
}

/**
 * Custom drag preview component
 * Shows a preview of what's being dragged
 */
interface DragPreviewProps {
  children: React.ReactNode;
  className?: string;
}

export function DragPreview({ children, className }: DragPreviewProps) {
  return (
    <div className={`opacity-50 ${className || ''}`}>
      {children}
    </div>
  );
}

/**
 * Drop indicator component
 * Shows where an item will be dropped
 */
interface DropIndicatorProps {
  isVisible: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function DropIndicator({
  isVisible,
  position = 'bottom',
  className,
}: DropIndicatorProps) {
  if (!isVisible) return null;

  const positionClasses = {
    top: 'top-0 left-0 right-0 h-0.5',
    bottom: 'bottom-0 left-0 right-0 h-0.5',
    left: 'left-0 top-0 bottom-0 w-0.5',
    right: 'right-0 top-0 bottom-0 w-0.5',
  };

  return (
    <div
      className={`absolute bg-primary ${positionClasses[position]} ${className || ''}`}
      aria-hidden="true"
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Screen reader announcements for drag-and-drop operations
 */
export function DragDropAnnouncer() {
  return (
    <div
      className="sr-only"
      role="status"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Announcements will be dynamically inserted here */}
    </div>
  );
}

/**
 * Generate accessible instructions for dragging
 */
export function getDragInstructions(itemName: string): string {
  return `Press space or enter to start dragging ${itemName}. While dragging, use arrow keys to move the item. Press space or enter again to drop. Press escape to cancel.`;
}

/**
 * Announce drag start
 */
export function announceDragStart(itemName: string, position: number): string {
  return `Started dragging ${itemName} at position ${position + 1}.`;
}

/**
 * Announce drag end
 */
export function announceDragEnd(
  itemName: string,
  oldPosition: number,
  newPosition: number
): string {
  if (oldPosition === newPosition) {
    return `Cancelled dragging ${itemName}. Item remains at position ${oldPosition + 1}.`;
  }
  return `Dropped ${itemName}. Moved from position ${oldPosition + 1} to position ${newPosition + 1}.`;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOKS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Hook to track the currently dragged item
 */
export function useActiveDragItem<T>(items: T[], getId: (item: T) => string) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const activeItem = React.useMemo(() => {
    if (!activeId) return null;
    return items.find((item) => getId(item) === activeId) || null;
  }, [items, activeId, getId]);

  return {
    activeId,
    activeItem,
    setActiveId,
  };
}

/**
 * Hook to manage drop zones
 */
export function useDropZones(count: number) {
  const [activeDropZone, setActiveDropZone] = React.useState<number | null>(null);

  const isDropZoneActive = (index: number) => activeDropZone === index;

  const dropZones = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      index: i,
      isActive: isDropZoneActive(i),
    }));
  }, [count, activeDropZone]);

  return {
    dropZones,
    activeDropZone,
    setActiveDropZone,
    isDropZoneActive,
  };
}
