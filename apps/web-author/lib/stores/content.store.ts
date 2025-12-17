/**
 * Content Store
 *
 * Zustand store for content authoring state management.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { ContentBlock } from '../api/content';
import type { Subject, GradeBand, LearningObject, LearningObjectVersion } from '../types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ContentFilter {
  search: string;
  subject: Subject | null;
  gradeBand: GradeBand | null;
  createdByMe: boolean;
}

export interface ContentState {
  // List state
  filter: ContentFilter;
  selectedContentIds: Set<string>;

  // Current content
  currentContent: LearningObject | null;
  currentVersion: LearningObjectVersion | null;
  versionBlocks: ContentBlock[];

  // Draft state
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;

  // UI state
  isContentPanelOpen: boolean;
  isVersionHistoryOpen: boolean;
  isPreviewOpen: boolean;

  // Actions - Filters
  setFilter: (filter: Partial<ContentFilter>) => void;
  resetFilter: () => void;

  // Actions - Selection
  selectContent: (id: string) => void;
  deselectContent: (id: string) => void;
  toggleContentSelection: (id: string) => void;
  clearContentSelection: () => void;

  // Actions - Current content
  setCurrentContent: (content: LearningObject | null) => void;
  setCurrentVersion: (version: LearningObjectVersion | null) => void;
  setVersionBlocks: (blocks: ContentBlock[]) => void;

  // Actions - Block editing
  addBlock: (block: ContentBlock, afterIndex?: number) => void;
  updateBlock: (blockId: string, data: Partial<ContentBlock>) => void;
  removeBlock: (blockId: string) => void;
  moveBlock: (blockId: string, toIndex: number) => void;
  duplicateBlock: (blockId: string) => void;

  // Actions - Save state
  markDirty: () => void;
  markSaved: () => void;

  // Actions - UI
  toggleContentPanel: () => void;
  toggleVersionHistory: () => void;
  togglePreview: () => void;

  // Actions - Reset
  resetContentState: () => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ══════════════════════════════════════════════════════════════════════════════

const initialFilter: ContentFilter = {
  search: '',
  subject: null,
  gradeBand: null,
  createdByMe: false,
};

// ══════════════════════════════════════════════════════════════════════════════
// STORE
// ══════════════════════════════════════════════════════════════════════════════

export const useContentStore = create<ContentState>()(
  immer((set, _get) => ({
    // Initial state
    filter: initialFilter,
    selectedContentIds: new Set(),
    currentContent: null,
    currentVersion: null,
    versionBlocks: [],
    hasUnsavedChanges: false,
    lastSavedAt: null,
    isContentPanelOpen: true,
    isVersionHistoryOpen: false,
    isPreviewOpen: false,

    // Filter actions
    setFilter: (filterUpdate) => {
      set((state) => {
        Object.assign(state.filter, filterUpdate);
      });
    },

    resetFilter: () => {
      set((state) => {
        state.filter = initialFilter;
      });
    },

    // Selection actions
    selectContent: (id) => {
      set((state) => {
        state.selectedContentIds.add(id);
      });
    },

    deselectContent: (id) => {
      set((state) => {
        state.selectedContentIds.delete(id);
      });
    },

    toggleContentSelection: (id) => {
      set((state) => {
        if (state.selectedContentIds.has(id)) {
          state.selectedContentIds.delete(id);
        } else {
          state.selectedContentIds.add(id);
        }
      });
    },

    clearContentSelection: () => {
      set((state) => {
        state.selectedContentIds = new Set();
      });
    },

    // Current content actions
    setCurrentContent: (content) => {
      set((state) => {
        state.currentContent = content;
        if (!content) {
          state.currentVersion = null;
          state.versionBlocks = [];
          state.hasUnsavedChanges = false;
        }
      });
    },

    setCurrentVersion: (version) => {
      set((state) => {
        state.currentVersion = version;
        state.versionBlocks = [];
        state.hasUnsavedChanges = false;
      });
    },

    setVersionBlocks: (blocks) => {
      set((state) => {
        state.versionBlocks = blocks;
      });
    },

    // Block editing actions
    addBlock: (block, afterIndex) => {
      set((state) => {
        if (afterIndex !== undefined && afterIndex >= 0) {
          state.versionBlocks.splice(afterIndex + 1, 0, block);
        } else {
          state.versionBlocks.push(block);
        }
        state.hasUnsavedChanges = true;
      });
    },

    updateBlock: (blockId, data) => {
      set((state) => {
        const index = state.versionBlocks.findIndex((b) => b.id === blockId);
        const block = state.versionBlocks[index];
        if (index !== -1 && block) {
          Object.assign(block, data);
          state.hasUnsavedChanges = true;
        }
      });
    },

    removeBlock: (blockId) => {
      set((state) => {
        const index = state.versionBlocks.findIndex((b) => b.id === blockId);
        if (index !== -1) {
          state.versionBlocks.splice(index, 1);
          state.hasUnsavedChanges = true;
        }
      });
    },

    moveBlock: (blockId, toIndex) => {
      set((state) => {
        const fromIndex = state.versionBlocks.findIndex((b) => b.id === blockId);
        if (fromIndex !== -1 && fromIndex !== toIndex) {
          const [block] = state.versionBlocks.splice(fromIndex, 1);
          if (block) {
            state.versionBlocks.splice(toIndex, 0, block);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    duplicateBlock: (blockId) => {
      set((state) => {
        const index = state.versionBlocks.findIndex((b) => b.id === blockId);
        const original = state.versionBlocks[index];
        if (index !== -1 && original) {
          const duplicate: ContentBlock = {
            ...(structuredClone(original) as ContentBlock),
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          };
          state.versionBlocks.splice(index + 1, 0, duplicate);
          state.hasUnsavedChanges = true;
        }
      });
    },

    // Save state actions
    markDirty: () => {
      set((state) => {
        state.hasUnsavedChanges = true;
      });
    },

    markSaved: () => {
      set((state) => {
        state.hasUnsavedChanges = false;
        state.lastSavedAt = new Date();
      });
    },

    // UI actions
    toggleContentPanel: () => {
      set((state) => {
        state.isContentPanelOpen = !state.isContentPanelOpen;
      });
    },

    toggleVersionHistory: () => {
      set((state) => {
        state.isVersionHistoryOpen = !state.isVersionHistoryOpen;
      });
    },

    togglePreview: () => {
      set((state) => {
        state.isPreviewOpen = !state.isPreviewOpen;
      });
    },

    // Reset
    resetContentState: () => {
      set((state) => {
        state.filter = initialFilter;
        state.selectedContentIds = new Set();
        state.currentContent = null;
        state.currentVersion = null;
        state.versionBlocks = [];
        state.hasUnsavedChanges = false;
        state.lastSavedAt = null;
        state.isContentPanelOpen = true;
        state.isVersionHistoryOpen = false;
        state.isPreviewOpen = false;
      });
    },
  }))
);

// ══════════════════════════════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════════════════════════════

export const selectFilter = (state: ContentState) => state.filter;
export const selectSelectedContentIds = (state: ContentState) => state.selectedContentIds;
export const selectCurrentContent = (state: ContentState) => state.currentContent;
export const selectCurrentVersion = (state: ContentState) => state.currentVersion;
export const selectVersionBlocks = (state: ContentState) => state.versionBlocks;
export const selectHasUnsavedChanges = (state: ContentState) => state.hasUnsavedChanges;
export const selectIsPreviewOpen = (state: ContentState) => state.isPreviewOpen;

// Block selectors
export const selectBlockById = (blockId: string) => (state: ContentState) =>
  state.versionBlocks.find((b) => b.id === blockId);

export const selectBlockIndex = (blockId: string) => (state: ContentState) =>
  state.versionBlocks.findIndex((b) => b.id === blockId);

export default useContentStore;
