import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as api from '@/lib/accessibility-api';
import { AccommodationManager } from '@/app/(teaching)/accessibility/components/AccommodationManager';
import { ProgressMonitor } from '@/app/(teaching)/accessibility/components/ProgressMonitor';
import { IEPIntegration } from '@/app/(teaching)/accessibility/components/IEPIntegration';
import { ResourceLibrary } from '@/app/(teaching)/accessibility/components/ResourceLibrary';

vi.mock('@/lib/accessibility-api');

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: vi.fn(() => <div data-testid="chart">Chart</div>),
}));

vi.mock('chart.js', () => ({
  Chart: vi.fn(),
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
  register: vi.fn(),
}));

describe('Accessibility - Accommodation Manager', () => {
  const mockAccommodations: api.Accommodation[] = [
    {
      id: '1',
      studentId: 'student123',
      type: 'visual',
      category: 'Seating',
      title: 'Preferential Seating',
      description: 'Student should sit in the front row',
      implementation: 'Place student in front left seat',
      frequency: 'always',
      status: 'active',
      effectiveness: 5,
      startDate: '2024-01-01',
      createdBy: 'teacher123',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
    },
  ];

  const mockTemplates: api.AccommodationTemplate[] = [
    {
      id: '1',
      name: 'Extended Time',
      type: 'testing',
      category: 'Time',
      description: '1.5x time on tests',
      implementation: 'Allow 1.5x the standard time',
      commonFor: ['ADHD', 'Processing Disorder'],
      tags: ['testing', 'time'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAccommodations).mockResolvedValue(mockAccommodations);
    vi.mocked(api.getAccommodationTemplates).mockResolvedValue(mockTemplates);
  });

  it('renders accommodations list', async () => {
    render(<AccommodationManager />);

    await waitFor(() => {
      expect(screen.getByText('Preferential Seating')).toBeInTheDocument();
      expect(screen.getByText('visual')).toBeInTheDocument();
    });
  });

  it('creates new accommodation', async () => {
    const newAccommodation: api.Accommodation = {
      id: '2',
      studentId: 'student123',
      type: 'cognitive',
      category: 'Notes',
      title: 'Note Taker',
      description: 'Provide notes',
      implementation: 'Share digital notes',
      frequency: 'always',
      status: 'trial',
      effectiveness: 3,
      startDate: '2024-01-15',
      createdBy: 'teacher123',
      createdAt: '2024-01-15T00:00:00.000Z',
      lastModified: '2024-01-15T00:00:00.000Z',
    };
    vi.mocked(api.createAccommodation).mockResolvedValue(newAccommodation);

    render(<AccommodationManager />);

    await waitFor(() => screen.getByText('+ New Accommodation'));
    fireEvent.click(screen.getByText('+ New Accommodation'));

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Note Taker' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createAccommodation).toHaveBeenCalled();
    });
  });

  it('updates accommodation effectiveness', async () => {
    const updated = { ...mockAccommodations[0], effectiveness: 4 };
    vi.mocked(api.updateAccommodation).mockResolvedValue(updated);

    render(<AccommodationManager />);

    await waitFor(() => screen.getByText('Preferential Seating'));
    fireEvent.click(screen.getByText('Preferential Seating'));

    await waitFor(() => screen.getByRole('slider'));
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '4' } });

    await waitFor(() => {
      expect(api.updateAccommodation).toHaveBeenCalled();
    });
  });

  it('deletes accommodation', async () => {
    vi.mocked(api.deleteAccommodation).mockResolvedValue(undefined);
    global.confirm = vi.fn(() => true);

    render(<AccommodationManager />);

    await waitFor(() => screen.getByText('Preferential Seating'));
    fireEvent.click(screen.getByText('Preferential Seating'));

    await waitFor(() => screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(api.deleteAccommodation).toHaveBeenCalledWith('1');
    });
  });

  it('filters accommodations by type', async () => {
    render(<AccommodationManager />);

    await waitFor(() => screen.getByText('Preferential Seating'));

    const typeFilter = screen.getByRole('combobox', { name: /all types/i });
    fireEvent.change(typeFilter, { target: { value: 'visual' } });

    expect(screen.getByText('Preferential Seating')).toBeInTheDocument();
  });
});

describe('Accessibility - Progress Monitor', () => {
  const mockGoals: api.ProgressGoal[] = [
    {
      id: '1',
      studentId: 'student123',
      domain: 'academic',
      subject: 'Math',
      goal: 'Increase math fluency',
      baseline: '20 problems in 5 min',
      target: '40 problems in 5 min',
      targetDate: '2024-06-01',
      measurementMethod: 'Timed worksheet',
      frequency: 'weekly',
      status: 'inProgress',
      progress: 50,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastUpdated: '2024-01-15T00:00:00.000Z',
    },
  ];

  const mockDataPoints: api.ProgressDataPoint[] = [
    {
      id: '1',
      goalId: '1',
      studentId: 'student123',
      date: '2024-01-08',
      value: 25,
      recordedBy: 'teacher123',
      createdAt: '2024-01-08T00:00:00.000Z',
    },
    {
      id: '2',
      goalId: '1',
      studentId: 'student123',
      date: '2024-01-15',
      value: 30,
      recordedBy: 'teacher123',
      createdAt: '2024-01-15T00:00:00.000Z',
    },
  ];

  const mockReport: api.ProgressReport = {
    goalId: '1',
    goal: mockGoals[0],
    dataPoints: mockDataPoints,
    trend: 'improving',
    insights: ['Steady improvement over 2 weeks'],
    recommendations: ['Continue current intervention'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getProgressGoals).mockResolvedValue(mockGoals);
    vi.mocked(api.getProgressData).mockResolvedValue(mockDataPoints);
    vi.mocked(api.getProgressReport).mockResolvedValue(mockReport);
  });

  it('renders progress goals', async () => {
    render(<ProgressMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Increase math fluency')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('creates new progress goal', async () => {
    const newGoal: api.ProgressGoal = {
      id: '2',
      studentId: 'student123',
      domain: 'behavioral',
      goal: 'Reduce outbursts',
      baseline: '5 per day',
      target: '1 per day',
      targetDate: '2024-05-01',
      measurementMethod: 'Daily tracking',
      frequency: 'daily',
      status: 'notStarted',
      progress: 0,
      createdAt: '2024-01-15T00:00:00.000Z',
      lastUpdated: '2024-01-15T00:00:00.000Z',
    };
    vi.mocked(api.createProgressGoal).mockResolvedValue(newGoal);

    render(<ProgressMonitor />);

    await waitFor(() => screen.getByText('+ New Goal'));
    fireEvent.click(screen.getByText('+ New Goal'));

    const goalInput = screen.getByLabelText('Goal');
    fireEvent.change(goalInput, { target: { value: 'Reduce outbursts' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createProgressGoal).toHaveBeenCalled();
    });
  });

  it('records progress data point', async () => {
    const newDataPoint: api.ProgressDataPoint = {
      id: '3',
      goalId: '1',
      studentId: 'student123',
      date: '2024-01-22',
      value: 35,
      notes: 'Great progress!',
      recordedBy: 'teacher123',
      createdAt: '2024-01-22T00:00:00.000Z',
    };
    vi.mocked(api.recordProgress).mockResolvedValue(newDataPoint);

    render(<ProgressMonitor />);

    await waitFor(() => screen.getByText('Increase math fluency'));
    fireEvent.click(screen.getByText('Increase math fluency'));

    await waitFor(() => screen.getByText('+ Record Progress'));
    fireEvent.click(screen.getByText('+ Record Progress'));

    const valueInput = screen.getByLabelText('Value');
    fireEvent.change(valueInput, { target: { value: '35' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(api.recordProgress).toHaveBeenCalled();
    });
  });

  it('displays progress chart', async () => {
    render(<ProgressMonitor />);

    await waitFor(() => screen.getByText('Increase math fluency'));
    fireEvent.click(screen.getByText('Increase math fluency'));

    await waitFor(() => {
      expect(screen.getByTestId('chart')).toBeInTheDocument();
      expect(screen.getByText('improving')).toBeInTheDocument();
    });
  });
});

describe('Accessibility - IEP Integration', () => {
  const mockDocuments: api.IEPDocument[] = [
    {
      id: '1',
      studentId: 'student123',
      meetingDate: '2024-01-01',
      effectiveDate: '2024-01-15',
      expirationDate: '2025-01-15',
      status: 'active',
      goals: ['goal1'],
      accommodations: [],
      services: [
        {
          type: 'Speech Therapy',
          frequency: '2x per week',
          duration: 30,
          location: 'Speech room',
          provider: 'Ms. Smith',
        },
      ],
      team: [
        {
          name: 'John Teacher',
          role: 'General Ed Teacher',
          email: 'john@school.edu',
        },
      ],
      documents: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
    },
  ];

  const mockGoals: api.IEPGoal[] = [
    {
      id: 'goal1',
      studentId: 'student123',
      iepId: '1',
      domain: 'Communication',
      annualGoal: 'Improve expressive language',
      shortTermObjectives: [
        {
          id: 'obj1',
          objective: 'Use 5-word sentences',
          criteria: '80% accuracy',
          method: 'Language samples',
          schedule: 'Weekly',
          status: 'inProgress',
          progress: 60,
        },
      ],
      accommodations: ['Extra time', 'Visual supports'],
      services: ['Speech therapy'],
      progressReporting: 'quarterly',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2025-01-15',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getIEPDocuments).mockResolvedValue(mockDocuments);
    vi.mocked(api.getIEPGoals).mockResolvedValue(mockGoals);
  });

  it('renders IEP documents', async () => {
    render(<IEPIntegration />);

    await waitFor(() => {
      expect(screen.getByText('IEP Document')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('displays IEP goal details', async () => {
    render(<IEPIntegration />);

    await waitFor(() => screen.getByText('Improve expressive language'));
    fireEvent.click(screen.getByText('Improve expressive language'));

    await waitFor(() => {
      expect(screen.getByText('Use 5-word sentences')).toBeInTheDocument();
      expect(screen.getByText('80% accuracy')).toBeInTheDocument();
    });
  });

  it('updates objective progress', async () => {
    const updated = {
      ...mockGoals[0],
      shortTermObjectives: [
        {
          ...mockGoals[0].shortTermObjectives[0],
          progress: 75,
        },
      ],
    };
    vi.mocked(api.updateObjectiveProgress).mockResolvedValue(updated);

    render(<IEPIntegration />);

    await waitFor(() => screen.getByText('Improve expressive language'));
    fireEvent.click(screen.getByText('Improve expressive language'));

    await waitFor(() => screen.getByRole('slider'));
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });

    await waitFor(() => {
      expect(api.updateObjectiveProgress).toHaveBeenCalled();
    });
  });

  it('creates new IEP goal', async () => {
    const newGoal: api.IEPGoal = {
      id: 'goal2',
      studentId: 'student123',
      iepId: '1',
      domain: 'Math',
      annualGoal: 'Improve math skills',
      shortTermObjectives: [],
      accommodations: [],
      services: [],
      progressReporting: 'quarterly',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2025-01-15',
      createdAt: '2024-01-15T00:00:00.000Z',
      lastModified: '2024-01-15T00:00:00.000Z',
    };
    vi.mocked(api.createIEPGoal).mockResolvedValue(newGoal);

    render(<IEPIntegration />);

    await waitFor(() => screen.getByText('+ New IEP Goal'));
    fireEvent.click(screen.getByText('+ New IEP Goal'));

    const goalInput = screen.getByLabelText('Annual Goal');
    fireEvent.change(goalInput, { target: { value: 'Improve math skills' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createIEPGoal).toHaveBeenCalled();
    });
  });
});

describe('Accessibility - Resource Library', () => {
  const mockResources: api.AccessibilityResource[] = [
    {
      id: '1',
      title: 'Visual Schedule Template',
      category: 'template',
      type: 'visual',
      description: 'A template for creating visual schedules',
      content: 'Template content...',
      gradeLevel: ['K-2', '3-5'],
      subjects: ['General'],
      disabilities: ['Autism', 'ADHD'],
      tags: ['schedule', 'visual'],
      rating: 4.5,
      downloads: 120,
      createdBy: 'teacher456',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
    },
  ];

  const mockCollections: api.ResourceCollection[] = [
    {
      id: '1',
      name: 'My Favorites',
      description: 'My favorite resources',
      teacherId: 'teacher123',
      resources: ['1'],
      isPublic: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getResources).mockResolvedValue(mockResources);
    vi.mocked(api.getCollections).mockResolvedValue(mockCollections);
  });

  it('renders resources', async () => {
    render(<ResourceLibrary />);

    await waitFor(() => {
      expect(screen.getByText('Visual Schedule Template')).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });
  });

  it('creates new resource', async () => {
    const newResource: api.AccessibilityResource = {
      id: '2',
      title: 'Social Story',
      category: 'lesson',
      type: 'behavioral',
      description: 'A social story about sharing',
      gradeLevel: ['K-2'],
      subjects: ['Social Skills'],
      disabilities: ['Autism'],
      tags: ['social', 'story'],
      rating: 0,
      downloads: 0,
      createdBy: 'teacher123',
      createdAt: '2024-01-15T00:00:00.000Z',
      lastModified: '2024-01-15T00:00:00.000Z',
    };
    vi.mocked(api.createResource).mockResolvedValue(newResource);

    render(<ResourceLibrary />);

    await waitFor(() => screen.getByText('+ New Resource'));
    fireEvent.click(screen.getByText('+ New Resource'));

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Social Story' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createResource).toHaveBeenCalled();
    });
  });

  it('creates new collection', async () => {
    const newCollection: api.ResourceCollection = {
      id: '2',
      name: 'Autism Resources',
      description: 'Resources for students with autism',
      teacherId: 'teacher123',
      resources: [],
      isPublic: true,
      createdAt: '2024-01-15T00:00:00.000Z',
      lastModified: '2024-01-15T00:00:00.000Z',
    };
    vi.mocked(api.createCollection).mockResolvedValue(newCollection);

    render(<ResourceLibrary />);

    await waitFor(() => screen.getByText('+ New Collection'));
    fireEvent.click(screen.getByText('+ New Collection'));

    const nameInput = screen.getByLabelText('Collection Name');
    fireEvent.change(nameInput, { target: { value: 'Autism Resources' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createCollection).toHaveBeenCalled();
    });
  });

  it('filters resources by category', async () => {
    render(<ResourceLibrary />);

    await waitFor(() => screen.getByText('Visual Schedule Template'));

    const categoryFilter = screen.getByRole('combobox', { name: /all categories/i });
    fireEvent.change(categoryFilter, { target: { value: 'template' } });

    expect(screen.getByText('Visual Schedule Template')).toBeInTheDocument();
  });

  it('searches resources', async () => {
    render(<ResourceLibrary />);

    await waitFor(() => screen.getByPlaceholderText('Search resources...'));

    const searchInput = screen.getByPlaceholderText('Search resources...');
    fireEvent.change(searchInput, { target: { value: 'visual' } });

    expect(screen.getByText('Visual Schedule Template')).toBeInTheDocument();
  });

  it('adds resource to collection', async () => {
    const updated = {
      ...mockCollections[0],
      resources: ['1', '2'],
    };
    vi.mocked(api.addToCollection).mockResolvedValue(updated);

    render(<ResourceLibrary />);

    await waitFor(() => screen.getByText('Visual Schedule Template'));
    fireEvent.click(screen.getByText('Visual Schedule Template'));

    await waitFor(() => screen.getByText('Add to Collection'));
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });

    await waitFor(() => {
      expect(api.addToCollection).toHaveBeenCalled();
    });
  });
});
