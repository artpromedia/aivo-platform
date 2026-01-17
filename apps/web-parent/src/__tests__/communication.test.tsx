import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommunicationDashboard } from '../app/(parent)/communication/components/CommunicationDashboard';
import { ProgressUpdates } from '../app/(parent)/communication/components/ProgressUpdates';
import { MessageCenter } from '../app/(parent)/communication/components/MessageCenter';
import { GoalSharing } from '../app/(parent)/communication/components/GoalSharing';
import { ResourceHub } from '../app/(parent)/communication/components/ResourceHub';
import * as api from '../lib/parent-communication-api';

// Mock API
vi.mock('../lib/parent-communication-api');

describe('CommunicationDashboard', () => {
  it('renders all tabs', () => {
    render(<CommunicationDashboard />);

    expect(screen.getByText('Progress Updates')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Shared Goals')).toBeInTheDocument();
    expect(screen.getByText('Resource Hub')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(<CommunicationDashboard />);

    const messagesTab = screen.getByText('Messages');
    fireEvent.click(messagesTab);

    expect(messagesTab.parentElement).toHaveAttribute('aria-current', 'page');
  });

  it('displays correct tab content', () => {
    render(<CommunicationDashboard />);

    // Default tab (Progress Updates) should be visible
    expect(screen.getByText(/Loading updates/i)).toBeInTheDocument();
  });
});

describe('ProgressUpdates', () => {
  const mockUpdates = [
    {
      id: '1',
      studentId: 'student-1',
      studentName: 'Alex',
      type: 'academic' as const,
      priority: 'high' as const,
      title: 'Math Progress',
      description: 'Great improvement in multiplication',
      timestamp: '2024-01-15T10:00:00Z',
      teacherId: 'teacher-1',
      teacherName: 'Ms. Smith',
      read: false,
      metrics: [
        { label: 'Score', value: '95%', change: 15 },
        { label: 'Accuracy', value: '92%', change: 10 },
      ],
    },
    {
      id: '2',
      studentId: 'student-1',
      type: 'achievement' as const,
      priority: 'normal' as const,
      title: 'Reading Badge Earned',
      description: 'Completed 10 books this month',
      timestamp: '2024-01-14T14:00:00Z',
      teacherId: 'teacher-1',
      teacherName: 'Ms. Smith',
      read: true,
    },
  ];

  const mockSummary = {
    total: 25,
    unread: 5,
    byType: {
      academic: 10,
      behavioral: 3,
      social: 2,
      achievement: 8,
      alert: 1,
      general: 1,
    },
    recentHighPriority: [mockUpdates[0]],
  };

  beforeEach(() => {
    vi.mocked(api.getProgressUpdates).mockResolvedValue(mockUpdates);
    vi.mocked(api.getUpdatesSummary).mockResolvedValue(mockSummary);
  });

  it('loads and displays progress updates', async () => {
    render(<ProgressUpdates />);

    await waitFor(() => {
      expect(screen.getByText('Math Progress')).toBeInTheDocument();
      expect(screen.getByText('Reading Badge Earned')).toBeInTheDocument();
    });
  });

  it('displays summary statistics', async () => {
    render(<ProgressUpdates />);

    await waitFor(() => {
      expect(screen.getByText('Total Updates')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Unread count
    });
  });

  it('shows high priority alerts', async () => {
    render(<ProgressUpdates />);

    await waitFor(() => {
      expect(screen.getByText('High Priority Updates')).toBeInTheDocument();
      expect(screen.getByText('Great improvement in multiplication')).toBeInTheDocument();
    });
  });

  it('filters by update type', async () => {
    render(<ProgressUpdates />);

    await waitFor(() => {
      expect(screen.getByText('Math Progress')).toBeInTheDocument();
    });

    const typeFilter = screen.getByRole('combobox', { name: '' });
    fireEvent.change(typeFilter, { target: { value: 'academic' } });

    await waitFor(() => {
      expect(api.getProgressUpdates).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'academic' })
      );
    });
  });

  it('filters unread only', async () => {
    render(<ProgressUpdates />);

    await waitFor(() => {
      expect(screen.getByText('Math Progress')).toBeInTheDocument();
    });

    const unreadCheckbox = screen.getByLabelText('Unread only');
    fireEvent.click(unreadCheckbox);

    await waitFor(() => {
      expect(api.getProgressUpdates).toHaveBeenCalledWith(
        expect.objectContaining({ unreadOnly: true })
      );
    });
  });

  it('displays update metrics', async () => {
    render(<ProgressUpdates />);

    await waitFor(() => {
      expect(screen.getByText('Score')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });
  });

  it('marks update as read', async () => {
    vi.mocked(api.markUpdateAsRead).mockResolvedValue(mockUpdates[0]);

    render(<ProgressUpdates />);

    await waitFor(() => {
      expect(screen.getByText('Math Progress')).toBeInTheDocument();
    });

    const markReadButton = screen.getByText('Mark as read');
    fireEvent.click(markReadButton);

    await waitFor(() => {
      expect(api.markUpdateAsRead).toHaveBeenCalledWith('1');
    });
  });

  it('displays priority badges with correct colors', async () => {
    render(<ProgressUpdates />);

    await waitFor(() => {
      const highPriorityBadge = screen.getByText('High');
      expect(highPriorityBadge).toHaveClass('bg-orange-100');

      const normalPriorityBadge = screen.getByText('Normal');
      expect(normalPriorityBadge).toHaveClass('bg-blue-100');
    });
  });

  it('shows correct type icons', async () => {
    render(<ProgressUpdates />);

    await waitFor(() => {
      const updates = screen.getAllByRole('heading', { level: 3 });
      expect(updates.length).toBeGreaterThan(0);
    });
  });

  it('handles loading state', () => {
    render(<ProgressUpdates />);
    expect(screen.getByText('Loading updates...')).toBeInTheDocument();
  });

  it('handles empty state', async () => {
    vi.mocked(api.getProgressUpdates).mockResolvedValue([]);

    render(<ProgressUpdates />);

    await waitFor(() => {
      expect(screen.getByText('No updates found')).toBeInTheDocument();
    });
  });
});

describe('MessageCenter', () => {
  const mockThreads = [
    {
      id: 'thread-1',
      participants: [
        { id: 'parent-1', name: 'Parent Smith', role: 'parent' as const },
        { id: 'teacher-1', name: 'Ms. Johnson', role: 'teacher' as const },
      ],
      subject: 'Math homework question',
      studentId: 'student-1',
      studentName: 'Alex',
      lastMessage: 'Thank you for the clarification',
      lastMessageTime: '2024-01-15T10:00:00Z',
      unreadCount: 2,
      messages: [
        {
          id: 'msg-1',
          parentId: 'parent-1',
          teacherId: 'teacher-1',
          teacherName: 'Ms. Johnson',
          studentId: 'student-1',
          subject: 'Math homework question',
          body: 'Could you clarify problem #5?',
          timestamp: '2024-01-15T09:00:00Z',
          status: 'read' as const,
        },
        {
          id: 'msg-2',
          parentId: 'parent-1',
          teacherId: 'teacher-1',
          teacherName: 'Ms. Johnson',
          studentId: 'student-1',
          subject: 'Math homework question',
          body: 'Of course! Problem #5 requires...',
          timestamp: '2024-01-15T09:30:00Z',
          status: 'unread' as const,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.mocked(api.getConversationThreads).mockResolvedValue(mockThreads);
    vi.mocked(api.markMessageAsRead).mockResolvedValue(mockThreads[0].messages[1]);
  });

  it('loads and displays conversation threads', async () => {
    render(<MessageCenter />);

    await waitFor(() => {
      expect(screen.getByText('Math homework question')).toBeInTheDocument();
      expect(screen.getByText('Ms. Johnson')).toBeInTheDocument();
    });
  });

  it('shows unread count badge', async () => {
    render(<MessageCenter />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('selects and displays thread messages', async () => {
    render(<MessageCenter />);

    await waitFor(() => {
      const thread = screen.getByText('Math homework question');
      fireEvent.click(thread);
    });

    await waitFor(() => {
      expect(screen.getByText('Could you clarify problem #5?')).toBeInTheDocument();
      expect(screen.getByText(/Of course! Problem #5 requires/)).toBeInTheDocument();
    });
  });

  it('marks messages as read when thread is selected', async () => {
    render(<MessageCenter />);

    await waitFor(() => {
      const thread = screen.getByText('Math homework question');
      fireEvent.click(thread);
    });

    await waitFor(() => {
      expect(api.markMessageAsRead).toHaveBeenCalledWith('msg-2');
    });
  });

  it('sends a reply message', async () => {
    vi.mocked(api.replyToMessage).mockResolvedValue({
      id: 'msg-3',
      parentId: 'parent-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      subject: 'Math homework question',
      body: 'Thank you!',
      timestamp: '2024-01-15T10:00:00Z',
      status: 'read' as const,
    });

    render(<MessageCenter />);

    await waitFor(() => {
      const thread = screen.getByText('Math homework question');
      fireEvent.click(thread);
    });

    const textarea = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(textarea, { target: { value: 'Thank you!' } });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(api.replyToMessage).toHaveBeenCalledWith('msg-1', {
        parentId: 'parent-1',
        body: 'Thank you!',
      });
    });
  });

  it('archives a conversation', async () => {
    vi.mocked(api.archiveMessage).mockResolvedValue();

    render(<MessageCenter />);

    await waitFor(() => {
      const thread = screen.getByText('Math homework question');
      fireEvent.click(thread);
    });

    const archiveButton = screen.getByText('📦 Archive');
    fireEvent.click(archiveButton);

    await waitFor(() => {
      expect(api.archiveMessage).toHaveBeenCalledWith('msg-1');
    });
  });

  it('shows new message composition', async () => {
    render(<MessageCenter />);

    await waitFor(() => {
      const newMessageButton = screen.getByText('✉️ New Message');
      fireEvent.click(newMessageButton);
    });

    expect(screen.getByText('New Message')).toBeInTheDocument();
  });

  it('handles empty state', async () => {
    vi.mocked(api.getConversationThreads).mockResolvedValue([]);

    render(<MessageCenter />);

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });
});

describe('GoalSharing', () => {
  const mockGoals = [
    {
      id: 'goal-1',
      studentId: 'student-1',
      studentName: 'Alex',
      title: 'Reading Fluency',
      description: 'Increase reading speed to 120 wpm',
      category: 'Reading',
      status: 'inProgress' as const,
      target: '120 wpm',
      current: 95,
      targetValue: 120,
      progress: 79,
      startDate: '2024-01-01',
      targetDate: '2024-03-01',
      teacherId: 'teacher-1',
      teacherName: 'Ms. Smith',
      teacherNotes: 'Great progress so far!',
      milestones: [
        { title: 'Reach 100 wpm', completed: false },
        { title: 'Maintain for 2 weeks', completed: false },
      ],
      supportStrategies: [
        'Practice 15 minutes daily',
        'Use finger tracking technique',
      ],
    },
  ];

  beforeEach(() => {
    vi.mocked(api.getSharedGoals).mockResolvedValue(mockGoals);
    vi.mocked(api.getGoalDetails).mockResolvedValue(mockGoals[0]);
  });

  it('loads and displays shared goals', async () => {
    render(<GoalSharing />);

    await waitFor(() => {
      expect(screen.getByText('Reading Fluency')).toBeInTheDocument();
      expect(screen.getByText('Reading')).toBeInTheDocument();
    });
  });

  it('shows progress percentage', async () => {
    render(<GoalSharing />);

    await waitFor(() => {
      expect(screen.getByText('79%')).toBeInTheDocument();
    });
  });

  it('filters goals by status', async () => {
    render(<GoalSharing />);

    await waitFor(() => {
      expect(screen.getByText('Reading Fluency')).toBeInTheDocument();
    });

    const statusFilter = screen.getByRole('combobox');
    fireEvent.change(statusFilter, { target: { value: 'inProgress' } });

    await waitFor(() => {
      expect(api.getSharedGoals).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inProgress' })
      );
    });
  });

  it('displays goal details when selected', async () => {
    render(<GoalSharing />);

    await waitFor(() => {
      const goal = screen.getByText('Reading Fluency');
      fireEvent.click(goal);
    });

    await waitFor(() => {
      expect(screen.getByText('Increase reading speed to 120 wpm')).toBeInTheDocument();
      expect(screen.getByText('120 wpm')).toBeInTheDocument();
      expect(screen.getByText('Great progress so far!')).toBeInTheDocument();
    });
  });

  it('displays milestones', async () => {
    render(<GoalSharing />);

    await waitFor(() => {
      const goal = screen.getByText('Reading Fluency');
      fireEvent.click(goal);
    });

    await waitFor(() => {
      expect(screen.getByText('Reach 100 wpm')).toBeInTheDocument();
      expect(screen.getByText('Maintain for 2 weeks')).toBeInTheDocument();
    });
  });

  it('displays support strategies', async () => {
    render(<GoalSharing />);

    await waitFor(() => {
      const goal = screen.getByText('Reading Fluency');
      fireEvent.click(goal);
    });

    await waitFor(() => {
      expect(screen.getByText('Practice 15 minutes daily')).toBeInTheDocument();
      expect(screen.getByText('Use finger tracking technique')).toBeInTheDocument();
    });
  });

  it('adds parent note', async () => {
    vi.mocked(api.addParentNote).mockResolvedValue(mockGoals[0]);

    render(<GoalSharing />);

    await waitFor(() => {
      const goal = screen.getByText('Reading Fluency');
      fireEvent.click(goal);
    });

    await waitFor(() => {
      const noteInput = screen.getByPlaceholderText(
        'Share your observations or ask a question...'
      );
      fireEvent.change(noteInput, { target: { value: 'Making good progress at home' } });

      const addButton = screen.getByText('Add Note');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(api.addParentNote).toHaveBeenCalledWith(
        'goal-1',
        'Making good progress at home'
      );
    });
  });

  it('updates goal progress', async () => {
    vi.mocked(api.updateGoalProgress).mockResolvedValue(mockGoals[0]);

    render(<GoalSharing />);

    await waitFor(() => {
      const goal = screen.getByText('Reading Fluency');
      fireEvent.click(goal);
    });

    await waitFor(() => {
      const progressInput = screen.getByPlaceholderText('Current: 95');
      fireEvent.change(progressInput, { target: { value: '100' } });

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);
    });

    await waitFor(() => {
      expect(api.updateGoalProgress).toHaveBeenCalledWith('goal-1', {
        current: 100,
        notes: 'Updated by parent to 100',
      });
    });
  });

  it('handles empty state', async () => {
    vi.mocked(api.getSharedGoals).mockResolvedValue([]);

    render(<GoalSharing />);

    await waitFor(() => {
      expect(screen.getByText('No goals found')).toBeInTheDocument();
    });
  });
});

describe('ResourceHub', () => {
  const mockResources = [
    {
      id: 'resource-1',
      title: 'Math Practice Workbook',
      category: 'book' as const,
      description: 'Comprehensive math exercises for grade 3',
      topics: ['multiplication', 'division', 'fractions'],
      difficulty: 'intermediate' as const,
      duration: 30,
      ageRange: ['8-9', '9-10'],
      recommended: true,
    },
    {
      id: 'resource-2',
      title: 'Reading Strategies Video',
      category: 'video' as const,
      description: 'Effective reading comprehension techniques',
      topics: ['reading', 'comprehension'],
      duration: 15,
      recommended: false,
    },
  ];

  const mockCollections = [
    {
      id: 'col-1',
      name: 'Math Resources',
      description: 'Helpful math materials',
      resources: ['resource-1'],
      parentId: 'parent-1',
      isPublic: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-15',
    },
  ];

  beforeEach(() => {
    vi.mocked(api.getResources).mockResolvedValue(mockResources);
    vi.mocked(api.getResourceCollections).mockResolvedValue(mockCollections);
    vi.mocked(api.getRecommendedResources).mockResolvedValue([mockResources[0]]);
  });

  it('loads and displays resources', async () => {
    render(<ResourceHub />);

    await waitFor(() => {
      expect(screen.getByText('Math Practice Workbook')).toBeInTheDocument();
      expect(screen.getByText('Reading Strategies Video')).toBeInTheDocument();
    });
  });

  it('filters by category', async () => {
    render(<ResourceHub />);

    await waitFor(() => {
      expect(screen.getByText('Math Practice Workbook')).toBeInTheDocument();
    });

    const categoryFilter = screen.getByRole('combobox', { name: '' });
    fireEvent.change(categoryFilter, { target: { value: 'book' } });

    await waitFor(() => {
      expect(api.getResources).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'book' })
      );
    });
  });

  it('searches resources', async () => {
    render(<ResourceHub />);

    const searchInput = screen.getByPlaceholderText('Search resources...');
    fireEvent.change(searchInput, { target: { value: 'math' } });

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(api.getResources).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'math' })
      );
    });
  });

  it('shows recommended resources only', async () => {
    render(<ResourceHub />);

    const recommendedCheckbox = screen.getByLabelText('Recommended for your child');
    fireEvent.click(recommendedCheckbox);

    await waitFor(() => {
      expect(api.getRecommendedResources).toHaveBeenCalled();
    });
  });

  it('displays resource metadata', async () => {
    render(<ResourceHub />);

    await waitFor(() => {
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('8-9, 9-10')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
    });
  });

  it('shows recommended badge', async () => {
    render(<ResourceHub />);

    await waitFor(() => {
      expect(screen.getByText('⭐ Recommended')).toBeInTheDocument();
    });
  });

  it('switches to collections view', async () => {
    render(<ResourceHub />);

    const collectionsTab = screen.getByText('⭐ My Collections');
    fireEvent.click(collectionsTab);

    await waitFor(() => {
      expect(screen.getByText('Math Resources')).toBeInTheDocument();
    });
  });

  it('displays collections', async () => {
    render(<ResourceHub />);

    const collectionsTab = screen.getByText('⭐ My Collections');
    fireEvent.click(collectionsTab);

    await waitFor(() => {
      expect(screen.getByText('Math Resources')).toBeInTheDocument();
      expect(screen.getByText('1 resources')).toBeInTheDocument();
      expect(screen.getByText('🔒 Private')).toBeInTheDocument();
    });
  });

  it('adds resource to collection', async () => {
    vi.mocked(api.addToCollection).mockResolvedValue(mockCollections[0]);

    render(<ResourceHub />);

    await waitFor(() => {
      expect(screen.getByText('Math Practice Workbook')).toBeInTheDocument();
    });

    const saveSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(saveSelect, { target: { value: 'col-1' } });

    await waitFor(() => {
      expect(api.addToCollection).toHaveBeenCalledWith('col-1', 'resource-1');
    });
  });

  it('handles empty resources state', async () => {
    vi.mocked(api.getResources).mockResolvedValue([]);

    render(<ResourceHub />);

    await waitFor(() => {
      expect(screen.getByText('No resources found')).toBeInTheDocument();
    });
  });
});
