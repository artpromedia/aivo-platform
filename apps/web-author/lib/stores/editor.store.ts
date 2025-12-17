/**
 * Editor Store
 *
 * Zustand store for editor state management including:
 * - Block selection and focus
 * - Collaboration state
 * - Undo/redo history
 * - Editor mode
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { Collaborator, CursorPosition, LockState } from '../api/collaboration';
import type { ContentBlock } from '../api/content';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type EditorMode = 'edit' | 'preview' | 'review';
export type BlockDragState = 'idle' | 'dragging' | 'dropping';

export interface HistoryEntry {
  blocks: ContentBlock[];
  timestamp: number;
  description?: string;
}

export interface EditorState {
  // Mode
  mode: EditorMode;

  // Selection
  selectedBlockId: string | null;
  focusedBlockId: string | null;
  hoveredBlockId: string | null;

  // Drag and drop
  dragState: BlockDragState;
  draggedBlockId: string | null;
  dropTargetIndex: number | null;

  // Collaboration
  collaborators: Collaborator[];
  remoteCursors: Map<string, CursorPosition>;
  blockLocks: Map<string, LockState>;
  isConnected: boolean;
  connectionError: Error | null;

  // History (undo/redo)
  history: HistoryEntry[];
  historyIndex: number;
  maxHistorySize: number;

  // Toolbar
  isToolbarVisible: boolean;
  toolbarPosition: { x: number; y: number } | null;

  // Block insertion
  isInsertMenuOpen: boolean;
  insertAfterBlockId: string | null;

  // Actions - Mode
  setMode: (mode: EditorMode) => void;

  // Actions - Selection
  selectBlock: (blockId: string | null) => void;
  focusBlock: (blockId: string | null) => void;
  hoverBlock: (blockId: string | null) => void;
  clearSelection: () => void;

  // Actions - Drag and drop
  startDrag: (blockId: string) => void;
  updateDropTarget: (index: number | null) => void;
  endDrag: () => void;
  cancelDrag: () => void;

  // Actions - Collaboration
  setCollaborators: (collaborators: Collaborator[]) => void;
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (userId: string) => void;
  updateRemoteCursor: (userId: string, position: CursorPosition | null) => void;
  setBlockLock: (blockId: string, lock: LockState | null) => void;
  clearBlockLocks: () => void;
  setConnectionState: (connected: boolean, error?: Error) => void;

  // Actions - History
  pushHistory: (blocks: ContentBlock[], description?: string) => void;
  undo: () => ContentBlock[] | null;
  redo: () => ContentBlock[] | null;
  clearHistory: () => void;

  // Actions - Toolbar
  showToolbar: (position: { x: number; y: number }) => void;
  hideToolbar: () => void;

  // Actions - Insert menu
  openInsertMenu: (afterBlockId: string | null) => void;
  closeInsertMenu: () => void;

  // Actions - Reset
  resetEditorState: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// STORE
// ══════════════════════════════════════════════════════════════════════════════

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    // Initial state
    mode: 'edit',
    selectedBlockId: null,
    focusedBlockId: null,
    hoveredBlockId: null,
    dragState: 'idle',
    draggedBlockId: null,
    dropTargetIndex: null,
    collaborators: [],
    remoteCursors: new Map(),
    blockLocks: new Map(),
    isConnected: false,
    connectionError: null,
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    isToolbarVisible: false,
    toolbarPosition: null,
    isInsertMenuOpen: false,
    insertAfterBlockId: null,

    // Mode actions
    setMode: (mode) => {
      set((state) => {
        state.mode = mode;
        // Clear selection when switching to preview mode
        if (mode === 'preview') {
          state.selectedBlockId = null;
          state.focusedBlockId = null;
        }
      });
    },

    // Selection actions
    selectBlock: (blockId) => {
      set((state) => {
        state.selectedBlockId = blockId;
        if (blockId) {
          state.focusedBlockId = blockId;
        }
      });
    },

    focusBlock: (blockId) => {
      set((state) => {
        state.focusedBlockId = blockId;
      });
    },

    hoverBlock: (blockId) => {
      set((state) => {
        state.hoveredBlockId = blockId;
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selectedBlockId = null;
        state.focusedBlockId = null;
        state.hoveredBlockId = null;
      });
    },

    // Drag and drop actions
    startDrag: (blockId) => {
      set((state) => {
        state.dragState = 'dragging';
        state.draggedBlockId = blockId;
      });
    },

    updateDropTarget: (index) => {
      set((state) => {
        state.dropTargetIndex = index;
        state.dragState = index === null ? 'dragging' : 'dropping';
      });
    },

    endDrag: () => {
      set((state) => {
        state.dragState = 'idle';
        state.draggedBlockId = null;
        state.dropTargetIndex = null;
      });
    },

    cancelDrag: () => {
      set((state) => {
        state.dragState = 'idle';
        state.draggedBlockId = null;
        state.dropTargetIndex = null;
      });
    },

    // Collaboration actions
    setCollaborators: (collaborators) => {
      set((state) => {
        state.collaborators = collaborators;
      });
    },

    addCollaborator: (collaborator) => {
      set((state) => {
        const index = state.collaborators.findIndex((c) => c.userId === collaborator.userId);
        if (index === -1) {
          state.collaborators.push(collaborator);
        } else {
          state.collaborators[index] = collaborator;
        }
      });
    },

    removeCollaborator: (userId) => {
      set((state) => {
        state.collaborators = state.collaborators.filter((c) => c.userId !== userId);
        state.remoteCursors.delete(userId);
      });
    },

    updateRemoteCursor: (userId, position) => {
      set((state) => {
        if (position) {
          state.remoteCursors.set(userId, position);
        } else {
          state.remoteCursors.delete(userId);
        }
      });
    },

    setBlockLock: (blockId, lock) => {
      set((state) => {
        if (lock) {
          state.blockLocks.set(blockId, lock);
        } else {
          state.blockLocks.delete(blockId);
        }
      });
    },

    clearBlockLocks: () => {
      set((state) => {
        state.blockLocks = new Map();
      });
    },

    setConnectionState: (connected, error) => {
      set((state) => {
        state.isConnected = connected;
        state.connectionError = error ?? null;
        if (!connected) {
          state.collaborators = [];
          state.remoteCursors = new Map();
        }
      });
    },

    // History actions
    pushHistory: (blocks, description) => {
      set((state) => {
        // Remove any future history if we're not at the end
        if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
        }

        // Add new entry
        const entry: HistoryEntry = {
          blocks: structuredClone(blocks),
          timestamp: Date.now(),
        };
        if (description) {
          entry.description = description;
        }
        state.history.push(entry);

        // Limit history size
        if (state.history.length > state.maxHistorySize) {
          state.history = state.history.slice(-state.maxHistorySize);
        }

        state.historyIndex = state.history.length - 1;
      });
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex > 0) {
        set((state) => {
          state.historyIndex = historyIndex - 1;
        });
        const entry = history[historyIndex - 1];
        return entry?.blocks ?? null;
      }
      return null;
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        set((state) => {
          state.historyIndex = historyIndex + 1;
        });
        const entry = history[historyIndex + 1];
        return entry?.blocks ?? null;
      }
      return null;
    },

    clearHistory: () => {
      set((state) => {
        state.history = [];
        state.historyIndex = -1;
      });
    },

    // Toolbar actions
    showToolbar: (position) => {
      set((state) => {
        state.isToolbarVisible = true;
        state.toolbarPosition = position;
      });
    },

    hideToolbar: () => {
      set((state) => {
        state.isToolbarVisible = false;
        state.toolbarPosition = null;
      });
    },

    // Insert menu actions
    openInsertMenu: (afterBlockId) => {
      set((state) => {
        state.isInsertMenuOpen = true;
        state.insertAfterBlockId = afterBlockId;
      });
    },

    closeInsertMenu: () => {
      set((state) => {
        state.isInsertMenuOpen = false;
        state.insertAfterBlockId = null;
      });
    },

    // Reset
    resetEditorState: () => {
      set((state) => {
        state.mode = 'edit';
        state.selectedBlockId = null;
        state.focusedBlockId = null;
        state.hoveredBlockId = null;
        state.dragState = 'idle';
        state.draggedBlockId = null;
        state.dropTargetIndex = null;
        state.collaborators = [];
        state.remoteCursors = new Map();
        state.blockLocks = new Map();
        state.isConnected = false;
        state.connectionError = null;
        state.history = [];
        state.historyIndex = -1;
        state.isToolbarVisible = false;
        state.toolbarPosition = null;
        state.isInsertMenuOpen = false;
        state.insertAfterBlockId = null;
      });
    },
  }))
);

// ══════════════════════════════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════════════════════════════

export const selectMode = (state: EditorState) => state.mode;
export const selectSelectedBlockId = (state: EditorState) => state.selectedBlockId;
export const selectFocusedBlockId = (state: EditorState) => state.focusedBlockId;
export const selectCollaborators = (state: EditorState) => state.collaborators;
export const selectIsConnected = (state: EditorState) => state.isConnected;
export const selectCanUndo = (state: EditorState) => state.historyIndex > 0;
export const selectCanRedo = (state: EditorState) => state.historyIndex < state.history.length - 1;

// Get lock for a specific block
export const selectBlockLock = (blockId: string) => (state: EditorState) =>
  state.blockLocks.get(blockId);

// Check if a block is locked by another user
export const selectIsBlockLockedByOther =
  (blockId: string, currentUserId: string) => (state: EditorState) => {
    const lock = state.blockLocks.get(blockId);
    return lock?.isLocked && lock.lockedBy !== currentUserId;
  };

// Get remote cursor for a user
export const selectRemoteCursor = (userId: string) => (state: EditorState) =>
  state.remoteCursors.get(userId);

export default useEditorStore;
