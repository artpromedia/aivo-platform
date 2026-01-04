/* eslint-disable @typescript-eslint/no-floating-promises */
/**
 * useLessonBuilder Hook
 *
 * React hook for lesson builder state management
 * Features:
 * - Block management (add, remove, reorder, update)
 * - Auto-save functionality
 * - Undo/redo history
 * - Lesson loading and saving
 */

'use client';

import * as React from 'react';

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

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  subject: string;
  gradeBand: string;
  isPublished: boolean;
  currentVersion?: {
    id: string;
    versionNumber: number;
    isDraft: boolean;
    blocks: Block[];
  };
}

interface LessonBuilderState {
  lesson: Lesson | null;
  blocks: Block[];
  selectedBlockId: string | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;
}

interface HistoryState {
  blocks: Block[];
  selectedBlockId: string | null;
}

// ════════════════════════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════════════════════════

export function useLessonBuilder(lessonId?: string) {
  const [state, setState] = React.useState<LessonBuilderState>({
    lesson: null,
    blocks: [],
    selectedBlockId: null,
    loading: false,
    saving: false,
    error: null,
  });

  // Undo/Redo history
  const [history, setHistory] = React.useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const [autoSaveTimer, setAutoSaveTimer] = React.useState<NodeJS.Timeout | null>(null);

  // ══════════════════════════════════════════════════════════════════════════
  // LOAD LESSON
  // ══════════════════════════════════════════════════════════════════════════

  const loadLesson = React.useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Mock API call - replace with actual API
      const response = await fetch(`/api/lessons/${id}`);
      if (!response.ok) throw new Error('Failed to load lesson');

      const lesson: Lesson = await response.json();
      const blocks = lesson.currentVersion?.blocks || [];

      setState({
        lesson,
        blocks,
        selectedBlockId: null,
        loading: false,
        saving: false,
        error: null,
      });

      // Initialize history
      setHistory([{ blocks, selectedBlockId: null }]);
      setHistoryIndex(0);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
    }
  }, []);

  // Load lesson on mount if lessonId provided
  React.useEffect(() => {
    if (lessonId) {
      loadLesson(lessonId);
    }
  }, [lessonId, loadLesson]);

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORY MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  const addToHistory = React.useCallback(
    (newBlocks: Block[], newSelectedBlockId: string | null) => {
      // Remove any history after current index
      const newHistory = history.slice(0, historyIndex + 1);

      // Add new state
      newHistory.push({ blocks: newBlocks, selectedBlockId: newSelectedBlockId });

      // Limit history size
      const maxHistory = 50;
      if (newHistory.length > maxHistory) {
        newHistory.shift();
      } else {
        setHistoryIndex(historyIndex + 1);
      }

      setHistory(newHistory);
    },
    [history, historyIndex]
  );

  const undo = React.useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const historyState = history[newIndex];

      setState((prev) => ({
        ...prev,
        blocks: historyState.blocks,
        selectedBlockId: historyState.selectedBlockId,
      }));

      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const redo = React.useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const historyState = history[newIndex];

      setState((prev) => ({
        ...prev,
        blocks: historyState.blocks,
        selectedBlockId: historyState.selectedBlockId,
      }));

      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // ══════════════════════════════════════════════════════════════════════════
  // AUTO-SAVE
  // ══════════════════════════════════════════════════════════════════════════

  const saveLesson = React.useCallback(async () => {
    if (!state.lesson) return;

    setState((prev) => ({ ...prev, saving: true }));

    try {
      // Mock API call - replace with actual API
      const response = await fetch(`/api/lessons/${state.lesson.id}/blocks/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockOrders: state.blocks.map((b) => ({ blockId: b.id, position: b.position })),
        }),
      });

      if (!response.ok) throw new Error('Failed to save lesson');

      setState((prev) => ({ ...prev, saving: false }));
    } catch (error) {
      console.error('Auto-save error:', error);
      setState((prev) => ({ ...prev, saving: false }));
    }
  }, [state.lesson, state.blocks]);

  const triggerAutoSave = React.useCallback(() => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer (save after 2 seconds of inactivity)
    const timer = setTimeout(() => {
      saveLesson();
    }, 2000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, saveLesson]);

  // Cleanup auto-save timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCK OPERATIONS
  // ══════════════════════════════════════════════════════════════════════════

  const addBlock = React.useCallback(
    async (type: string, position: number) => {
      if (!state.lesson) return;

      try {
        // Mock API call - replace with actual API
        const response = await fetch(`/api/lessons/${state.lesson.id}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            position,
            content: getDefaultContent(type),
            settings: {},
          }),
        });

        if (!response.ok) throw new Error('Failed to add block');

        const newBlock: Block = await response.json();

        const newBlocks = [
          ...state.blocks.slice(0, position),
          newBlock,
          ...state.blocks.slice(position).map((b) => ({ ...b, position: b.position + 1 })),
        ];

        setState((prev) => ({
          ...prev,
          blocks: newBlocks,
          selectedBlockId: newBlock.id,
        }));

        addToHistory(newBlocks, newBlock.id);
        triggerAutoSave();
      } catch (error) {
        console.error('Failed to add block:', error);
      }
    },
    [state.lesson, state.blocks, addToHistory, triggerAutoSave]
  );

  const updateBlock = React.useCallback(
    async (blockId: string, updates: Partial<Block>) => {
      if (!state.lesson) return;

      try {
        // Optimistic update
        const newBlocks = state.blocks.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block
        );

        setState((prev) => ({ ...prev, blocks: newBlocks }));

        // API call
        const response = await fetch(`/api/lessons/${state.lesson.id}/blocks/${blockId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error('Failed to update block');

        addToHistory(newBlocks, state.selectedBlockId);
        triggerAutoSave();
      } catch (error) {
        console.error('Failed to update block:', error);
        // Revert on error
        setState((prev) => ({ ...prev, blocks: state.blocks }));
      }
    },
    [state.lesson, state.blocks, state.selectedBlockId, addToHistory, triggerAutoSave]
  );

  const deleteBlock = React.useCallback(
    async (blockId: string) => {
      if (!state.lesson) return;

      try {
        const newBlocks = state.blocks
          .filter((b) => b.id !== blockId)
          .map((b, index) => ({ ...b, position: index }));

        setState((prev) => ({
          ...prev,
          blocks: newBlocks,
          selectedBlockId: prev.selectedBlockId === blockId ? null : prev.selectedBlockId,
        }));

        // API call
        const response = await fetch(`/api/lessons/${state.lesson.id}/blocks/${blockId}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete block');

        addToHistory(newBlocks, state.selectedBlockId === blockId ? null : state.selectedBlockId);
        triggerAutoSave();
      } catch (error) {
        console.error('Failed to delete block:', error);
        // Revert on error
        setState((prev) => ({ ...prev, blocks: state.blocks }));
      }
    },
    [state.lesson, state.blocks, state.selectedBlockId, addToHistory, triggerAutoSave]
  );

  const duplicateBlock = React.useCallback(
    async (blockId: string) => {
      const blockToDuplicate = state.blocks.find((b) => b.id === blockId);
      if (!blockToDuplicate) return;

      const position = blockToDuplicate.position + 1;
      await addBlock(blockToDuplicate.type, position);

      // Update the duplicated block with the same content
      const newBlockId = state.blocks[position]?.id;
      if (newBlockId) {
        await updateBlock(newBlockId, {
          content: blockToDuplicate.content,
          settings: blockToDuplicate.settings,
        });
      }
    },
    [state.blocks, addBlock, updateBlock]
  );

  const reorderBlocks = React.useCallback(
    (newBlocks: Block[]) => {
      setState((prev) => ({ ...prev, blocks: newBlocks }));
      addToHistory(newBlocks, state.selectedBlockId);
      triggerAutoSave();
    },
    [state.selectedBlockId, addToHistory, triggerAutoSave]
  );

  const selectBlock = React.useCallback((blockId: string | null) => {
    setState((prev) => ({ ...prev, selectedBlockId: blockId }));
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ══════════════════════════════════════════════════════════════════════════

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo (Cmd/Ctrl + Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo (Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y)
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key === 'y')
      ) {
        e.preventDefault();
        redo();
      }

      // Save (Cmd/Ctrl + S)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveLesson();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, saveLesson]);

  // ══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ══════════════════════════════════════════════════════════════════════════

  return {
    // State
    lesson: state.lesson,
    blocks: state.blocks,
    selectedBlockId: state.selectedBlockId,
    loading: state.loading,
    saving: state.saving,
    error: state.error,

    // Block operations
    addBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    reorderBlocks,
    selectBlock,

    // History
    undo,
    redo,
    canUndo,
    canRedo,

    // Lesson operations
    loadLesson,
    saveLesson,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getDefaultContent(type: string): Record<string, any> {
  const defaults: Record<string, any> = {
    TEXT_PARAGRAPH: { text: '<p>Enter your text here...</p>' },
    TEXT_HEADING: { text: 'Section Heading', level: 2 },
    TEXT_LIST: { items: ['Item 1', 'Item 2', 'Item 3'], listType: 'unordered' },
    TEXT_QUOTE: { text: 'Enter quote text here...', author: '' },
    MEDIA_IMAGE: { url: '', alt: '', caption: '' },
    MEDIA_VIDEO: { url: '', provider: 'youtube', title: '' },
    MEDIA_AUDIO: { url: '', title: '' },
    MEDIA_EMBED: { embedCode: '', url: '' },
    QUIZ: {
      question: 'Enter your question here...',
      type: 'multiple_choice',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: '',
    },
    POLL: { question: 'What do you think?', options: ['Option 1', 'Option 2', 'Option 3'] },
    FLASHCARD: {
      cards: [
        { front: 'Term 1', back: 'Definition 1' },
        { front: 'Term 2', back: 'Definition 2' },
      ],
    },
    DRAG_DROP: {
      instruction: 'Drag items to the correct category',
      items: ['Item 1', 'Item 2', 'Item 3'],
      categories: ['Category A', 'Category B'],
      correctMatches: {},
    },
    ACTIVITY_WORKSHEET: {
      title: 'Practice Worksheet',
      instructions: 'Complete the following exercises...',
      questions: [],
    },
    ACTIVITY_ASSIGNMENT: {
      title: 'Assignment',
      instructions: 'Complete this assignment...',
      dueDate: null,
      points: 100,
    },
    ACTIVITY_DISCUSSION: { prompt: 'Discuss the following question...', minimumWords: 0 },
    LAYOUT_COLUMNS: {
      columns: [{ content: 'Column 1 content' }, { content: 'Column 2 content' }],
    },
    LAYOUT_DIVIDER: {},
    LAYOUT_CALLOUT: { text: 'Important information...', title: '' },
    LAYOUT_ACCORDION: {
      sections: [
        { title: 'Section 1', content: 'Content 1' },
        { title: 'Section 2', content: 'Content 2' },
      ],
    },
  };

  return defaults[type] || {};
}
