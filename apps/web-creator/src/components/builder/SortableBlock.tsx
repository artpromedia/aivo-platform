/**
 * Sortable Block Component
 * Drag-and-drop wrapper for content blocks with actions
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  GripVertical,
  MoreVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentBlock } from '@/lib/api/content';

interface SortableBlockProps {
  block: ContentBlock;
  isSelected: boolean;
  isLocked?: boolean;
  lockedBy?: { id: string; name: string; color: string };
  hasAdaptiveRules?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility?: () => void;
  onOpenSettings?: () => void;
  onOpenAdaptive?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  children: React.ReactNode;
}

export const SortableBlock: React.FC<SortableBlockProps> = ({
  block,
  isSelected,
  isLocked = false,
  lockedBy,
  hasAdaptiveRules = false,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onOpenSettings,
  onOpenAdaptive,
  isFirst = false,
  isLast = false,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isHidden = block.content?.hidden === true;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border bg-card transition-all',
        isSelected && 'ring-2 ring-primary border-primary',
        isDragging && 'opacity-50 z-50 shadow-lg',
        isHidden && 'opacity-60',
        isLocked && 'cursor-not-allowed',
        !isSelected && !isDragging && 'hover:border-muted-foreground/30'
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!isLocked) onSelect();
      }}
    >
      {/* Lock Overlay */}
      {isLocked && lockedBy && (
        <div
          className="absolute inset-0 bg-black/5 rounded-lg z-10 flex items-center justify-center"
          style={{ borderColor: lockedBy.color }}
        >
          <div
            className="px-3 py-1 rounded-full text-xs text-white flex items-center gap-1"
            style={{ backgroundColor: lockedBy.color }}
          >
            <Lock className="h-3 w-3" />
            Editing by {lockedBy.name}
          </div>
        </div>
      )}

      {/* Block Header - Always visible on hover or selection */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b bg-muted/30 rounded-t-lg transition-opacity',
          !isSelected && 'opacity-0 group-hover:opacity-100'
        )}
      >
        {/* Left side: Drag handle + Type */}
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted',
              isLocked && 'cursor-not-allowed opacity-50'
            )}
            disabled={isLocked}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Block Type Badge */}
          <Badge variant="secondary" className="text-xs capitalize">
            {getBlockTypeLabel(block.type)}
          </Badge>

          {/* Indicators */}
          <div className="flex items-center gap-1">
            {isHidden && (
              <Tooltip>
                <TooltipTrigger>
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Hidden from students</TooltipContent>
              </Tooltip>
            )}
            {hasAdaptiveRules && (
              <Tooltip>
                <TooltipTrigger>
                  <Zap className="h-3 w-3 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>Has adaptive rules</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-1">
          {/* Move buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={isFirst || isLocked}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move up</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={isLast || isLocked}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move down</TooltipContent>
          </Tooltip>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => e.stopPropagation()}
                disabled={isLocked}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {onOpenSettings && (
                <DropdownMenuItem onClick={onOpenSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              )}
              {onOpenAdaptive && (
                <DropdownMenuItem onClick={onOpenAdaptive}>
                  <Zap className="h-4 w-4 mr-2" />
                  Adaptive Rules
                </DropdownMenuItem>
              )}
              {onToggleVisibility && (
                <DropdownMenuItem onClick={onToggleVisibility}>
                  {isHidden ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show to Students
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide from Students
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Block Content */}
      <div className="p-4">{children}</div>
    </div>
  );
};

// Helper function to get human-readable block type labels
function getBlockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    text: 'Text',
    heading: 'Heading',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    'multiple-choice': 'Multiple Choice',
    'true-false': 'True/False',
    'fill-blank': 'Fill in the Blank',
    'short-answer': 'Short Answer',
    essay: 'Essay',
    matching: 'Matching',
    ordering: 'Ordering',
    flashcard: 'Flashcard',
    'flashcard-set': 'Flashcard Set',
    interactive: 'Interactive',
    simulation: 'Simulation',
    embed: 'Embed',
    divider: 'Divider',
    callout: 'Callout',
    accordion: 'Accordion',
    tabs: 'Tabs',
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

// Drop placeholder for empty areas
interface DropPlaceholderProps {
  isOver: boolean;
}

export const DropPlaceholder: React.FC<DropPlaceholderProps> = ({ isOver }) => (
  <div
    className={cn(
      'h-2 rounded-full transition-all duration-200',
      isOver ? 'h-16 bg-primary/20 border-2 border-dashed border-primary' : 'bg-transparent'
    )}
  />
);

// Block Skeleton for loading states
export const BlockSkeleton: React.FC = () => (
  <div className="rounded-lg border bg-card animate-pulse">
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
      <div className="h-4 w-4 bg-gray-200 rounded" />
      <div className="h-5 w-20 bg-gray-200 rounded" />
    </div>
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);
