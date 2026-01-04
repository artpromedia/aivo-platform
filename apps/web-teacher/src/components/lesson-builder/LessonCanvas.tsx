'use client';

/**
 * Lesson Canvas Component
 *
 * Main drag-and-drop canvas for building lessons with blocks
 * Features:
 * - Drag and drop blocks from palette
 * - Reorder blocks by dragging
 * - Drop zones between blocks
 * - Block selection and editing
 * - Undo/redo support
 * - Keyboard shortcuts
 */

import React from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, Settings, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface Block {
  id: string;
  type: string;
  position: number;
  content: Record<string, any>;
  settings?: Record<string, any>;
}

interface LessonCanvasProps {
  blocks: Block[];
  selectedBlockId?: string;
  onBlocksReorder: (blocks: Block[]) => void;
  onBlockSelect: (blockId: string) => void;
  onBlockDelete: (blockId: string) => void;
  onBlockDuplicate: (blockId: string) => void;
  onBlockSettingsOpen: (blockId: string) => void;
  onAddBlock: (type: string, position: number) => void;
  readOnly?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function LessonCanvas({
  blocks,
  selectedBlockId,
  onBlocksReorder,
  onBlockSelect,
  onBlockDelete,
  onBlockDuplicate,
  onBlockSettingsOpen,
  onAddBlock,
  readOnly = false,
}: LessonCanvasProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      const reorderedBlocks = arrayMove(blocks, oldIndex, newIndex).map((block, index) => ({
        ...block,
        position: index,
      }));

      onBlocksReorder(reorderedBlocks);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected block (Delete or Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId && !isInputFocused()) {
        e.preventDefault();
        onBlockDelete(selectedBlockId);
      }

      // Duplicate selected block (Cmd/Ctrl + D)
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedBlockId) {
        e.preventDefault();
        onBlockDuplicate(selectedBlockId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBlockId, readOnly, onBlockDelete, onBlockDuplicate]);

  const activeBlock = blocks.find((b) => b.id === activeId);

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Canvas Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lesson Canvas</h2>
            <p className="text-sm text-muted-foreground">
              {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
            </p>
          </div>
        </div>
      </div>

      {/* Canvas Content */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-4xl p-6">
          {blocks.length === 0 ? (
            <EmptyState onAddBlock={onAddBlock} />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {/* Add block at top */}
                  {!readOnly && (
                    <BlockDropZone position={0} onAddBlock={onAddBlock} label="Add block at top" />
                  )}

                  {blocks.map((block, index) => (
                    <React.Fragment key={block.id}>
                      <SortableBlockCard
                        block={block}
                        isSelected={block.id === selectedBlockId}
                        onSelect={onBlockSelect}
                        onDelete={onBlockDelete}
                        onDuplicate={onBlockDuplicate}
                        onSettingsOpen={onBlockSettingsOpen}
                        readOnly={readOnly}
                      />

                      {/* Drop zone after each block */}
                      {!readOnly && (
                        <BlockDropZone
                          position={index + 1}
                          onAddBlock={onAddBlock}
                          label={`Add block after ${getBlockTypeName(block.type)}`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeBlock ? (
                  <BlockCard block={activeBlock} isDragging isSelected={false} readOnly />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SORTABLE BLOCK CARD
// ════════════════════════════════════════════════════════════════════════════

interface SortableBlockCardProps {
  block: Block;
  isSelected: boolean;
  onSelect: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onSettingsOpen: (blockId: string) => void;
  readOnly?: boolean;
}

function SortableBlockCard({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onSettingsOpen,
  readOnly,
}: SortableBlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockCard
        block={block}
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onSettingsOpen={onSettingsOpen}
        dragHandleProps={{ ...attributes, ...listeners }}
        readOnly={readOnly}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK CARD
// ════════════════════════════════════════════════════════════════════════════

interface BlockCardProps {
  block: Block;
  isSelected: boolean;
  isDragging?: boolean;
  onSelect?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
  onSettingsOpen?: (blockId: string) => void;
  dragHandleProps?: any;
  readOnly?: boolean;
}

function BlockCard({
  block,
  isSelected,
  isDragging = false,
  onSelect,
  onDelete,
  onDuplicate,
  onSettingsOpen,
  dragHandleProps,
  readOnly,
}: BlockCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-lg border-2 bg-white transition-all',
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300',
        isDragging && 'shadow-xl'
      )}
      onClick={() => onSelect?.(block.id)}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        {!readOnly && (
          <div
            {...dragHandleProps}
            className="flex cursor-grab items-center text-gray-400 hover:text-gray-600 active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}

        {/* Block Content Preview */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">{getBlockTypeName(block.type)}</span>
          </div>
          <div className="text-sm text-gray-900">
            <BlockPreview block={block} />
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div
            className={cn(
              'flex items-center gap-1 transition-opacity',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSettingsOpen?.(block.id);
              }}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate?.(block.id);
              }}
              title="Duplicate (Cmd+D)"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(block.id);
              }}
              title="Delete (Del)"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK DROP ZONE
// ════════════════════════════════════════════════════════════════════════════

interface BlockDropZoneProps {
  position: number;
  onAddBlock: (type: string, position: number) => void;
  label?: string;
}

function BlockDropZone({ position, onAddBlock, label }: BlockDropZoneProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className={cn(
        'group relative flex h-8 items-center justify-center transition-all',
        isHovered && 'h-12'
      )}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <div
        className={cn(
          'absolute inset-0 rounded border-2 border-dashed transition-all',
          isHovered ? 'border-blue-400 bg-blue-50' : 'border-transparent'
        )}
      />
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'relative z-10 transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        onClick={() => {
          // Open block palette at this position
          // For now, add a default text block
          onAddBlock('TEXT_PARAGRAPH', position);
        }}
        title={label}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add Block
      </Button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════════════════════════════════

function EmptyState({ onAddBlock }: { onAddBlock: (type: string, position: number) => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mb-4 text-gray-400">
        <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">No blocks yet</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">
        Start building your lesson by adding blocks from the palette on the left, or click the button below.
      </p>
      <Button
        onClick={() => {
          onAddBlock('TEXT_PARAGRAPH', 0);
        }}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Your First Block
      </Button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BLOCK PREVIEW
// ════════════════════════════════════════════════════════════════════════════

function BlockPreview({ block }: { block: Block }) {
  const { type, content } = block;

  // Render preview based on block type
  switch (type) {
    case 'TEXT_PARAGRAPH':
      return <div className="line-clamp-2" dangerouslySetInnerHTML={{ __html: content.text || 'Empty paragraph' }} />;

    case 'TEXT_HEADING':
      return <div className="font-semibold">{content.text || 'Empty heading'}</div>;

    case 'TEXT_LIST':
      return <div>List with {content.items?.length || 0} items</div>;

    case 'TEXT_QUOTE':
      return <div className="italic">"{content.text || 'Empty quote'}"</div>;

    case 'MEDIA_IMAGE':
      return (
        <div className="flex items-center gap-2">
          <div className="h-12 w-12 rounded bg-gray-100" />
          <span>{content.alt || 'Image'}</span>
        </div>
      );

    case 'MEDIA_VIDEO':
      return <div>Video: {content.title || content.url || 'Untitled'}</div>;

    case 'MEDIA_AUDIO':
      return <div>Audio: {content.title || 'Untitled'}</div>;

    case 'QUIZ':
      return <div>Quiz: {content.question || 'Question'}</div>;

    case 'POLL':
      return <div>Poll: {content.question || 'Poll question'}</div>;

    case 'FLASHCARD':
      return <div>Flashcard set ({content.cards?.length || 0} cards)</div>;

    case 'ACTIVITY_WORKSHEET':
      return <div>Worksheet: {content.title || 'Untitled'}</div>;

    case 'ACTIVITY_ASSIGNMENT':
      return <div>Assignment: {content.title || 'Untitled'} ({content.points || 0} pts)</div>;

    case 'ACTIVITY_DISCUSSION':
      return <div className="line-clamp-2">Discussion: {content.prompt || 'Prompt'}</div>;

    case 'LAYOUT_DIVIDER':
      return <div className="border-t border-gray-300" />;

    case 'LAYOUT_CALLOUT':
      return <div>Callout: {content.text || 'Content'}</div>;

    default:
      return <div>{type}</div>;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getBlockTypeName(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement?.getAttribute('contenteditable') === 'true'
  );
}
