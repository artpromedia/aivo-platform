/**
 * Tests for Creator Portal Builder Components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock components for testing
vi.mock('@tiptap/react', () => ({
  useEditor: () => ({
    commands: {
      setContent: vi.fn(),
      toggleBold: vi.fn(),
      toggleItalic: vi.fn(),
      toggleHeading: vi.fn(),
      setTextAlign: vi.fn(),
    },
    isActive: vi.fn().mockReturnValue(false),
    getHTML: vi.fn().mockReturnValue('<p>Test content</p>'),
    getText: vi.fn().mockReturnValue('Test content'),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    isEmpty: false,
  }),
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content">Editor Content</div>
  ),
  BubbleMenu: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));

// Test utilities
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// AdaptiveConditionBuilder Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('AdaptiveConditionBuilder', () => {
  // Import dynamically to avoid hoisting issues
  let AdaptiveConditionBuilder: any;

  beforeEach(async () => {
    const module = await import('../../components/builder/AdaptiveConditionBuilder');
    AdaptiveConditionBuilder = module.AdaptiveConditionBuilder;
  });

  it('should render with no conditions initially', () => {
    const onChange = vi.fn();
    render(
      <AdaptiveConditionBuilder conditions={[]} onChange={onChange} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/add condition/i)).toBeInTheDocument();
  });

  it('should add a new condition when button clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AdaptiveConditionBuilder conditions={[]} onChange={onChange} />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByText(/add condition/i));

    // Should show condition type selector
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('should display existing conditions', () => {
    const conditions = [
      { type: 'mastery', skillId: 'skill-1', operator: 'gte', value: 80 },
    ];

    render(
      <AdaptiveConditionBuilder conditions={conditions} onChange={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/mastery/i)).toBeInTheDocument();
  });

  it('should remove condition when delete clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const conditions = [
      { type: 'mastery', skillId: 'skill-1', operator: 'gte', value: 80 },
    ];

    render(
      <AdaptiveConditionBuilder conditions={conditions} onChange={onChange} />,
      { wrapper: createWrapper() }
    );

    const deleteButton = screen.getByRole('button', { name: /remove/i });
    await user.click(deleteButton);

    expect(onChange).toHaveBeenCalledWith([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SortableBlock Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('SortableBlock', () => {
  let SortableBlock: any;

  beforeEach(async () => {
    const module = await import('../../components/builder/SortableBlock');
    SortableBlock = module.SortableBlock;
  });

  it('should render block with type badge', () => {
    const block = {
      id: 'block-1',
      type: 'text',
      content: { html: '<p>Hello</p>' },
      order: 0,
    };

    render(
      <SortableBlock
        block={block}
        isSelected={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      >
        <div>Block content</div>
      </SortableBlock>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Block content')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const block = {
      id: 'block-1',
      type: 'text',
      content: {},
      order: 0,
    };

    render(
      <SortableBlock
        block={block}
        isSelected={false}
        onSelect={onSelect}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      >
        <div>Content</div>
      </SortableBlock>,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByText('Content'));
    expect(onSelect).toHaveBeenCalled();
  });

  it('should show selected state', () => {
    const block = {
      id: 'block-1',
      type: 'heading',
      content: {},
      order: 0,
    };

    const { container } = render(
      <SortableBlock
        block={block}
        isSelected={true}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      >
        <div>Content</div>
      </SortableBlock>,
      { wrapper: createWrapper() }
    );

    // Check for selected ring class
    expect(container.querySelector('.ring-2')).toBeInTheDocument();
  });

  it('should disable move up button when first', () => {
    const block = {
      id: 'block-1',
      type: 'text',
      content: {},
      order: 0,
    };

    render(
      <SortableBlock
        block={block}
        isSelected={true}
        isFirst={true}
        isLast={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      >
        <div>Content</div>
      </SortableBlock>,
      { wrapper: createWrapper() }
    );

    const buttons = screen.getAllByRole('button');
    const moveUpBtn = buttons.find(btn => btn.querySelector('svg.lucide-chevron-up'));
    expect(moveUpBtn).toBeDisabled();
  });

  it('should show lock overlay when locked by another user', () => {
    const block = {
      id: 'block-1',
      type: 'text',
      content: {},
      order: 0,
    };

    render(
      <SortableBlock
        block={block}
        isSelected={false}
        isLocked={true}
        lockedBy={{ id: 'user-2', name: 'Jane', color: '#ff0000' }}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      >
        <div>Content</div>
      </SortableBlock>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/editing by jane/i)).toBeInTheDocument();
  });

  it('should show adaptive rules indicator', () => {
    const block = {
      id: 'block-1',
      type: 'text',
      content: {},
      order: 0,
    };

    render(
      <SortableBlock
        block={block}
        isSelected={true}
        hasAdaptiveRules={true}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      >
        <div>Content</div>
      </SortableBlock>,
      { wrapper: createWrapper() }
    );

    // Adaptive indicator (Zap icon) should be present
    const zapIcon = document.querySelector('.text-yellow-500');
    expect(zapIcon).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PreviewModal Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('PreviewModal', () => {
  let PreviewModal: any;

  beforeEach(async () => {
    const module = await import('../../components/builder/PreviewModal');
    PreviewModal = module.PreviewModal;
  });

  it('should render with device selector', () => {
    const lesson = {
      id: 'lesson-1',
      title: 'Test Lesson',
      blocks: [],
    };

    render(
      <PreviewModal
        open={true}
        onOpenChange={vi.fn()}
        lesson={lesson}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('should show lesson title', () => {
    const lesson = {
      id: 'lesson-1',
      title: 'My Amazing Lesson',
      blocks: [],
    };

    render(
      <PreviewModal
        open={true}
        onOpenChange={vi.fn()}
        lesson={lesson}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('My Amazing Lesson')).toBeInTheDocument();
  });

  it('should render text blocks', () => {
    const lesson = {
      id: 'lesson-1',
      title: 'Test Lesson',
      blocks: [
        {
          id: 'block-1',
          type: 'text',
          content: { html: '<p>Hello World</p>' },
          order: 0,
        },
      ],
    };

    render(
      <PreviewModal
        open={true}
        onOpenChange={vi.fn()}
        lesson={lesson}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should render multiple choice questions', () => {
    const lesson = {
      id: 'lesson-1',
      title: 'Test Lesson',
      blocks: [
        {
          id: 'block-1',
          type: 'multiple-choice',
          content: {
            question: 'What is 2 + 2?',
            options: [
              { id: 'a', text: '3' },
              { id: 'b', text: '4' },
              { id: 'c', text: '5' },
            ],
            correctOptionId: 'b',
          },
          order: 0,
        },
      ],
    };

    render(
      <PreviewModal
        open={true}
        onOpenChange={vi.fn()}
        lesson={lesson}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call onOpenChange when closed', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const lesson = {
      id: 'lesson-1',
      title: 'Test Lesson',
      blocks: [],
    };

    render(
      <PreviewModal
        open={true}
        onOpenChange={onOpenChange}
        lesson={lesson}
      />,
      { wrapper: createWrapper() }
    );

    // Find and click close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// VersionHistoryPanel Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('VersionHistoryPanel', () => {
  let VersionHistoryPanel: any;

  beforeEach(async () => {
    // Mock the content API
    vi.mock('@/lib/api/content', () => ({
      contentApi: {
        getLessonVersions: vi.fn().mockResolvedValue([
          {
            id: 'v1',
            version: 1,
            createdAt: '2024-01-01T00:00:00Z',
            createdBy: { id: 'user-1', name: 'John' },
            note: 'Initial version',
          },
          {
            id: 'v2',
            version: 2,
            createdAt: '2024-01-02T00:00:00Z',
            createdBy: { id: 'user-1', name: 'John' },
            note: 'Added questions',
          },
        ]),
        getLessonVersion: vi.fn().mockResolvedValue({
          id: 'lesson-1',
          title: 'Test',
          blocks: [],
        }),
      },
    }));

    const module = await import('../../components/builder/VersionHistoryPanel');
    VersionHistoryPanel = module.VersionHistoryPanel;
  });

  it('should render version history header', () => {
    render(
      <VersionHistoryPanel
        open={true}
        onOpenChange={vi.fn()}
        lessonId="lesson-1"
        onRestore={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Version History')).toBeInTheDocument();
  });

  it('should show versions when loaded', async () => {
    render(
      <VersionHistoryPanel
        open={true}
        onOpenChange={vi.fn()}
        lessonId="lesson-1"
        onRestore={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('v1')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
  });

  it('should show empty state when no version selected', () => {
    render(
      <VersionHistoryPanel
        open={true}
        onOpenChange={vi.fn()}
        lessonId="lesson-1"
        onRestore={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/select a version/i)).toBeInTheDocument();
  });
});
