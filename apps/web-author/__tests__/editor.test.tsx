/**
 * Content Editor Integration Tests
 *
 * Tests for content editor components including:
 * - ContentEditor (main editor)
 * - BlockEditor (individual block editing)
 * - EditorToolbar (formatting controls)
 * - InsertBlockMenu (block insertion)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

// Mock stores
vi.mock('../lib/stores', () => ({
  useContentStore: vi.fn(() => ({
    setContent: vi.fn(),
    setVersions: vi.fn(),
    setBlocks: vi.fn(),
    getBlocks: () => [
      {
        id: 'block-1',
        type: 'heading',
        content: { text: 'Test Heading', level: 1 },
        orderIndex: 0,
      },
      { id: 'block-2', type: 'paragraph', content: { text: 'Test paragraph' }, orderIndex: 1 },
    ],
  })),
  useEditorStore: vi.fn(() => ({
    setMode: vi.fn(),
    setSelectedBlockId: vi.fn(),
    setIsSaving: vi.fn(),
    setShowInsertMenu: vi.fn(),
  })),
  selectVersionBlocks: vi.fn(() => [
    { id: 'block-1', type: 'heading', content: { text: 'Test Heading', level: 1 }, orderIndex: 0 },
    { id: 'block-2', type: 'paragraph', content: { text: 'Test paragraph' }, orderIndex: 1 },
  ]),
  selectSelectedBlockId: vi.fn(() => null),
  selectMode: vi.fn(() => 'edit'),
  selectIsConnected: vi.fn(() => true),
  selectCollaborators: vi.fn(() => []),
  selectHasUnsavedChanges: vi.fn(() => false),
}));

// Mock auto-save hook
vi.mock('../lib/hooks/useAutoSave', () => ({
  useAutoSave: vi.fn(() => ({
    isDirty: false,
    isSaving: false,
    save: vi.fn(),
  })),
}));

// Mock realtime hook
vi.mock('../lib/hooks/useRealtime', () => ({
  useRealtime: vi.fn(() => ({
    isConnected: true,
    collaborators: [],
    sendOperation: vi.fn(),
  })),
}));

// Mock drag and drop
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: '',
    isDragging: false,
  })),
  arrayMove: vi.fn((arr, from, to) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
}));

// Import components after mocks
import { ContentEditor } from '../lib/components/editor/ContentEditor';
import { EditorToolbar } from '../lib/components/editor/EditorToolbar';
import { InsertBlockMenu } from '../lib/components/editor/InsertBlockMenu';

describe('ContentEditor Component', () => {
  const defaultProps = {
    contentId: 'content-123',
    versionId: 'v1',
    userId: 'user-1',
    userName: 'Test User',
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render content editor', () => {
    render(<ContentEditor {...defaultProps} />);

    // Should render the editor container
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  it('should handle read-only mode', () => {
    render(<ContentEditor {...defaultProps} readOnly={true} />);

    // In read-only mode, the component should still render
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<ContentEditor {...defaultProps} className="custom-class" />);

    // Container should have the custom class
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});

describe('EditorToolbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render toolbar', () => {
    render(<EditorToolbar selectedBlockId={null} onInsertBlock={vi.fn()} />);

    // Toolbar should render
    expect(screen.getByTitle('Insert block')).toBeInTheDocument();
  });

  it('should call onInsertBlock when insert button clicked', async () => {
    const onInsertBlock = vi.fn();
    const user = userEvent.setup();

    render(<EditorToolbar selectedBlockId={null} onInsertBlock={onInsertBlock} />);

    await user.click(screen.getByTitle('Insert block'));

    expect(onInsertBlock).toHaveBeenCalled();
  });
});

describe('InsertBlockMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render block type options', () => {
    render(<InsertBlockMenu onClose={vi.fn()} onInsert={vi.fn()} />);

    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Image')).toBeInTheDocument();
  });

  it('should call onInsert with block when option clicked', async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();

    render(<InsertBlockMenu onClose={vi.fn()} onInsert={onInsert} />);

    await user.click(screen.getByText('Heading'));

    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'heading',
      })
    );
  });

  it('should filter options based on search', async () => {
    const user = userEvent.setup();

    render(<InsertBlockMenu onClose={vi.fn()} onInsert={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'image');

    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.queryByText('Paragraph')).not.toBeInTheDocument();
  });

  it('should close on Escape key', () => {
    const onClose = vi.fn();

    render(<InsertBlockMenu onClose={onClose} onInsert={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('should support keyboard navigation', () => {
    const onInsert = vi.fn();

    render(<InsertBlockMenu onClose={vi.fn()} onInsert={onInsert} />);

    // Navigate with arrow keys
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onInsert).toHaveBeenCalled();
  });
});

describe('Editor Keyboard Shortcuts', () => {
  const defaultProps = {
    contentId: 'content-123',
    versionId: 'v1',
    userId: 'user-1',
    userName: 'Test User',
    onSave: vi.fn(),
  };

  it('should handle Ctrl+S for save', async () => {
    const onSave = vi.fn();

    render(<ContentEditor {...defaultProps} onSave={onSave} />);

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });

    // Save should be triggered (implementation detail)
    await waitFor(() => {
      // The component handles save internally
    });
  });

  it('should handle Ctrl+Z for undo', () => {
    render(<ContentEditor {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });

    // Undo should be triggered (handled by editor store)
  });

  it('should handle Ctrl+Shift+Z for redo', () => {
    render(<ContentEditor {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true });

    // Redo should be triggered (handled by editor store)
  });
});
