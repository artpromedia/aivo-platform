/**
 * ContentEditor Component
 *
 * Main content editor with:
 * - Block-based editing
 * - Drag and drop reordering
 * - Real-time collaboration
 * - Auto-save
 */

'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { updateVersion, type ContentBlock } from '../../api/content';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useRealtime } from '../../hooks/useRealtime';
import {
  selectCollaborators,
  selectHasUnsavedChanges,
  selectIsConnected,
  selectMode,
  selectSelectedBlockId,
  selectVersionBlocks,
  useContentStore,
  useEditorStore,
} from '../../stores';

import { BlockEditor } from './BlockEditor';
import { CollaboratorAvatars } from './CollaboratorAvatars';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { InsertBlockMenu } from './InsertBlockMenu';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ContentEditorProps {
  readonly contentId: string;
  readonly versionId: string;
  readonly userId: string;
  readonly userName: string;
  readonly initialBlocks?: ContentBlock[];
  readonly readOnly?: boolean;
  readonly onSave?: (blocks: ContentBlock[]) => void;
  readonly onPublish?: () => void;
  readonly className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ContentEditor({
  contentId,
  versionId,
  userId,
  userName,
  initialBlocks = [],
  readOnly = false,
  onSave,
  onPublish,
  className = '',
}: ContentEditorProps) {
  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeBlock, setActiveBlock] = useState<ContentBlock | null>(null);

  // Content store
  const versionBlocks = useContentStore(selectVersionBlocks);
  const hasUnsavedChanges = useContentStore(selectHasUnsavedChanges);
  const setVersionBlocks = useContentStore((s) => s.setVersionBlocks);
  const addBlock = useContentStore((s) => s.addBlock);
  const updateBlock = useContentStore((s) => s.updateBlock);
  const removeBlock = useContentStore((s) => s.removeBlock);
  const moveBlock = useContentStore((s) => s.moveBlock);
  const markSaved = useContentStore((s) => s.markSaved);

  // Editor store
  const mode = useEditorStore(selectMode);
  const selectedBlockId = useEditorStore(selectSelectedBlockId);
  const collaborators = useEditorStore(selectCollaborators);
  const isConnected = useEditorStore(selectIsConnected);
  const setMode = useEditorStore((s) => s.setMode);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const startDrag = useEditorStore((s) => s.startDrag);
  const endDrag = useEditorStore((s) => s.endDrag);
  const setCollaborators = useEditorStore((s) => s.setCollaborators);
  const setConnectionState = useEditorStore((s) => s.setConnectionState);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const isInsertMenuOpen = useEditorStore((s) => s.isInsertMenuOpen);
  const insertAfterBlockId = useEditorStore((s) => s.insertAfterBlockId);
  const closeInsertMenu = useEditorStore((s) => s.closeInsertMenu);

  // Initialize blocks
  useEffect(() => {
    if (initialBlocks.length > 0) {
      setVersionBlocks(initialBlocks);
      pushHistory(initialBlocks, 'Initial load');
    }
  }, [initialBlocks, setVersionBlocks, pushHistory]);

  // ────────────────────────────────────────────────────────────────────────────
  // REAL-TIME COLLABORATION
  // ────────────────────────────────────────────────────────────────────────────

  const {
    isConnected: wsConnected,
    connectionError,
    collaborators: rtCollaborators,
    updateCursor: _updateCursor,
    sendOperation,
  } = useRealtime({
    contentId,
    versionId,
    userId,
    userName,
    autoConnect: !readOnly,
    onUserJoined: (collaborator) => {
      setCollaborators([...collaborators, collaborator]);
    },
    onUserLeft: (leftUserId) => {
      setCollaborators(collaborators.filter((c) => c.userId !== leftUserId));
    },
    onContentChanged: (operation) => {
      // Apply remote operation
      if (operation.type === 'update') {
        updateBlock(operation.blockId, operation.data as Partial<ContentBlock>);
      } else if (operation.type === 'insert') {
        const newBlock = operation.data as unknown as ContentBlock;
        addBlock(newBlock);
      } else if (operation.type === 'delete') {
        removeBlock(operation.blockId);
      } else {
        // Handle 'move' operations
        const { toIndex } = operation.data as { toIndex: number };
        moveBlock(operation.blockId, toIndex);
      }
    },
    onError: (error) => {
      console.error('[ContentEditor] Collaboration error:', error);
      setConnectionState(false, error);
    },
  });

  useEffect(() => {
    setConnectionState(wsConnected, connectionError ?? undefined);
  }, [wsConnected, connectionError, setConnectionState]);

  useEffect(() => {
    if (rtCollaborators.length > 0) {
      setCollaborators(rtCollaborators);
    }
  }, [rtCollaborators, setCollaborators]);

  // ────────────────────────────────────────────────────────────────────────────
  // AUTO-SAVE
  // ────────────────────────────────────────────────────────────────────────────

  const saveContent = useCallback(
    async (blocks: ContentBlock[]): Promise<ContentBlock[]> => {
      const contentJson = { blocks };
      await updateVersion(contentId, Number.parseInt(versionId, 10), { contentJson });
      onSave?.(blocks);
      return blocks;
    },
    [contentId, versionId, onSave]
  );

  const {
    isDirty,
    isSaving,
    saveError,
    lastSavedAt,
    save: triggerSave,
  } = useAutoSave({
    key: `content:${contentId}:${versionId}`,
    data: versionBlocks,
    onSave: saveContent,
    debounceMs: 2000,
    enabled: !readOnly && mode === 'edit',
    onSaveSuccess: () => {
      markSaved();
    },
  });

  // ────────────────────────────────────────────────────────────────────────────
  // DRAG AND DROP
  // ────────────────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const blockId = event.active.id as string;
      startDrag(blockId);
      const block = versionBlocks.find((b) => b.id === blockId);
      setActiveBlock(block ?? null);
    },
    [versionBlocks, startDrag]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = versionBlocks.findIndex((b) => b.id === active.id);
        const newIndex = versionBlocks.findIndex((b) => b.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          moveBlock(active.id as string, newIndex);
          pushHistory(versionBlocks, 'Move block');

          // Send operation to collaborators
          sendOperation({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            type: 'move',
            blockId: active.id as string,
            data: { toIndex: newIndex },
            applied: true,
          }).catch(console.error);
        }
      }

      endDrag();
      setActiveBlock(null);
    },
    [versionBlocks, moveBlock, pushHistory, sendOperation, endDrag]
  );

  const handleDragCancel = useCallback(() => {
    endDrag();
    setActiveBlock(null);
  }, [endDrag]);

  // ────────────────────────────────────────────────────────────────────────────
  // BLOCK OPERATIONS
  // ────────────────────────────────────────────────────────────────────────────

  const handleBlockChange = useCallback(
    (blockId: string, data: Partial<ContentBlock>) => {
      updateBlock(blockId, data);

      // Send operation to collaborators
      sendOperation({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: 'update',
        blockId,
        data,
        applied: true,
      }).catch(console.error);
    },
    [updateBlock, sendOperation]
  );

  const handleBlockDelete = useCallback(
    (blockId: string) => {
      pushHistory(versionBlocks, 'Delete block');
      removeBlock(blockId);

      // Send operation to collaborators
      sendOperation({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: 'delete',
        blockId,
        data: {},
        applied: true,
      }).catch(console.error);

      // Clear selection if deleted block was selected
      if (selectedBlockId === blockId) {
        selectBlock(null);
      }
    },
    [versionBlocks, pushHistory, removeBlock, sendOperation, selectedBlockId, selectBlock]
  );

  const handleInsertBlock = useCallback(
    (block: ContentBlock) => {
      pushHistory(versionBlocks, 'Add block');

      const afterIndex = insertAfterBlockId
        ? versionBlocks.findIndex((b) => b.id === insertAfterBlockId)
        : versionBlocks.length - 1;

      addBlock(block, afterIndex);
      closeInsertMenu();
      selectBlock(block.id);

      // Send operation to collaborators
      sendOperation({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: 'insert',
        blockId: block.id,
        data: block as unknown as Record<string, unknown>,
        applied: true,
      }).catch(console.error);
    },
    [
      versionBlocks,
      pushHistory,
      addBlock,
      insertAfterBlockId,
      closeInsertMenu,
      selectBlock,
      sendOperation,
    ]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if editor is focused
      if (!editorRef.current?.contains(document.activeElement)) return;

      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void triggerSave();
      }

      // Delete/Backspace to delete selected block
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedBlockId &&
        !document.activeElement?.closest('[contenteditable]')
      ) {
        e.preventDefault();
        handleBlockDelete(selectedBlockId);
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        selectBlock(null);
        closeInsertMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerSave, selectedBlockId, handleBlockDelete, selectBlock, closeInsertMenu]);

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  const blockIds = useMemo(() => versionBlocks.map((b) => b.id), [versionBlocks]);

  return (
    <div ref={editorRef} className={`content-editor flex flex-col h-full ${className}`}>
      {/* Header with save status and collaborators */}
      <EditorHeader
        hasUnsavedChanges={hasUnsavedChanges || isDirty}
        isSaving={isSaving}
        saveError={saveError}
        lastSavedAt={lastSavedAt}
        isConnected={isConnected}
        mode={mode}
        onModeChange={setMode}
        onSave={triggerSave}
        onPublish={onPublish}
        readOnly={readOnly}
      >
        <CollaboratorAvatars collaborators={collaborators} maxVisible={5} />
      </EditorHeader>

      {/* Toolbar */}
      {!readOnly && mode === 'edit' && (
        <EditorToolbar
          selectedBlockId={selectedBlockId}
          onInsertBlock={() => {
            useEditorStore.getState().openInsertMenu(selectedBlockId);
          }}
        />
      )}

      {/* Editor content */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            <div className="max-w-4xl mx-auto space-y-4">
              {versionBlocks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-4">No content yet. Start by adding a block.</p>
                  <button
                    onClick={() => {
                      useEditorStore.getState().openInsertMenu(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add First Block
                  </button>
                </div>
              ) : (
                versionBlocks.map((block, index) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    index={index}
                    isSelected={selectedBlockId === block.id}
                    isReadOnly={readOnly || mode !== 'edit'}
                    collaborators={collaborators}
                    onSelect={() => {
                      selectBlock(block.id);
                    }}
                    onChange={(data: Partial<ContentBlock>) => {
                      handleBlockChange(block.id, data);
                    }}
                    onDelete={() => {
                      handleBlockDelete(block.id);
                    }}
                    onAddAfter={() => {
                      useEditorStore.getState().openInsertMenu(block.id);
                    }}
                  />
                ))
              )}
            </div>
          </SortableContext>

          {/* Drag overlay */}
          <DragOverlay>
            {activeBlock && (
              <div className="opacity-80 shadow-xl">
                <BlockEditor
                  block={activeBlock}
                  index={-1}
                  isSelected={false}
                  isReadOnly={true}
                  collaborators={[]}
                  onSelect={Function.prototype as () => void}
                  onChange={Function.prototype as () => void}
                  onDelete={Function.prototype as () => void}
                  onAddAfter={Function.prototype as () => void}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Insert block menu */}
      {isInsertMenuOpen && (
        <InsertBlockMenu onInsert={handleInsertBlock} onClose={closeInsertMenu} />
      )}
    </div>
  );
}

export default ContentEditor;
