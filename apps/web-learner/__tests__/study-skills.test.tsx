import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as api from '@/lib/study-skills-api';
import { NoteTakingTemplates } from '@/app/(learning)/study-skills/components/NoteTakingTemplates';
import { StudyGuides } from '@/app/(learning)/study-skills/components/StudyGuides';
import { MemoryTechniques } from '@/app/(learning)/study-skills/components/MemoryTechniques';
import { TestPrep } from '@/app/(learning)/study-skills/components/TestPrep';

vi.mock('@/lib/study-skills-api');

describe('Study Skills - Note Taking Templates', () => {
  const mockTemplates: api.NoteTemplate[] = [
    {
      id: '1',
      userId: 'user123',
      name: 'Cornell Notes',
      type: 'cornell',
      sections: [
        { title: 'Cue Column', content: '', formatting: {} },
        { title: 'Note Taking Area', content: '', formatting: {} },
        { title: 'Summary', content: '', formatting: {} },
      ],
      tags: ['structured', 'review'],
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
    },
  ];

  const mockNotes: api.Note[] = [
    {
      id: '1',
      userId: 'user123',
      templateId: '1',
      subject: 'History',
      title: 'World War II',
      sections: [
        { title: 'Cue Column', content: 'Key dates', formatting: {} },
        { title: 'Note Taking Area', content: 'Started in 1939...', formatting: {} },
        { title: 'Summary', content: 'Major global conflict', formatting: {} },
      ],
      wordCount: 150,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastEdited: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getNoteTemplates).mockResolvedValue(mockTemplates);
    vi.mocked(api.getNotes).mockResolvedValue(mockNotes);
  });

  it('renders note templates and notes', async () => {
    render(<NoteTakingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Cornell Notes')).toBeInTheDocument();
      expect(screen.getByText('World War II')).toBeInTheDocument();
    });
  });

  it('creates a new note template', async () => {
    const newTemplate: api.NoteTemplate = {
      id: '2',
      userId: 'user123',
      name: 'Outline Notes',
      type: 'outline',
      sections: [{ title: 'Main Points', content: '', formatting: {} }],
      tags: [],
      createdAt: '2024-01-02T00:00:00.000Z',
      lastModified: '2024-01-02T00:00:00.000Z',
    };
    vi.mocked(api.createNoteTemplate).mockResolvedValue(newTemplate);

    render(<NoteTakingTemplates />);

    await waitFor(() => screen.getByText('+ New Template'));
    fireEvent.click(screen.getByText('+ New Template'));

    const nameInput = screen.getByPlaceholderText('Template Name');
    fireEvent.change(nameInput, { target: { value: 'Outline Notes' } });

    const typeSelect = screen.getByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'outline' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createNoteTemplate).toHaveBeenCalled();
    });
  });

  it('creates a note from template', async () => {
    const newNote: api.Note = {
      id: '2',
      userId: 'user123',
      templateId: '1',
      subject: 'Science',
      title: 'Photosynthesis',
      sections: mockTemplates[0].sections,
      wordCount: 0,
      createdAt: '2024-01-02T00:00:00.000Z',
      lastEdited: '2024-01-02T00:00:00.000Z',
    };
    vi.mocked(api.createNote).mockResolvedValue(newNote);

    render(<NoteTakingTemplates />);

    await waitFor(() => screen.getByText('Use'));
    fireEvent.click(screen.getByText('Use'));

    const subjectInput = screen.getByPlaceholderText('Subject');
    fireEvent.change(subjectInput, { target: { value: 'Science' } });

    const titleInput = screen.getByPlaceholderText('Title');
    fireEvent.change(titleInput, { target: { value: 'Photosynthesis' } });

    fireEvent.click(screen.getByText('Create Note'));

    await waitFor(() => {
      expect(api.createNote).toHaveBeenCalled();
    });
  });

  it('updates note sections', async () => {
    const updatedNote = { ...mockNotes[0], wordCount: 200 };
    vi.mocked(api.updateNote).mockResolvedValue(updatedNote);

    render(<NoteTakingTemplates />);

    await waitFor(() => screen.getByText('World War II'));
    fireEvent.click(screen.getByText('World War II'));

    await waitFor(() => screen.getByDisplayValue('Key dates'));
    const cueInput = screen.getByDisplayValue('Key dates');
    fireEvent.change(cueInput, { target: { value: 'Key dates: 1939-1945' } });

    await waitFor(() => {
      expect(api.updateNote).toHaveBeenCalled();
    });
  });

  it('deletes a template', async () => {
    vi.mocked(api.deleteNoteTemplate).mockResolvedValue(undefined);
    global.confirm = vi.fn(() => true);

    render(<NoteTakingTemplates />);

    await waitFor(() => screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(api.deleteNoteTemplate).toHaveBeenCalledWith('1');
    });
  });
});

describe('Study Skills - Study Guides', () => {
  const mockGuides: api.StudyGuide[] = [
    {
      id: '1',
      userId: 'user123',
      subject: 'Biology',
      topic: 'Cell Structure',
      description: 'Study guide for cell biology',
      sections: [
        {
          type: 'keyTerms',
          title: 'Key Terms',
          content: '',
        },
      ],
      keyTerms: [
        {
          term: 'Mitochondria',
          definition: 'Powerhouse of the cell',
          examples: ['ATP production'],
          category: 'organelles',
        },
      ],
      practiceQuestions: [
        {
          id: 'q1',
          question: 'What is the function of mitochondria?',
          type: 'multipleChoice',
          difficulty: 'medium',
          options: ['Energy production', 'Protein synthesis', 'DNA storage', 'Waste removal'],
          correctAnswer: 'Energy production',
        },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getStudyGuides).mockResolvedValue(mockGuides);
  });

  it('renders study guides', async () => {
    render(<StudyGuides />);

    await waitFor(() => {
      expect(screen.getByText('Cell Structure')).toBeInTheDocument();
      expect(screen.getByText('Biology')).toBeInTheDocument();
    });
  });

  it('creates a new study guide', async () => {
    const newGuide: api.StudyGuide = {
      id: '2',
      userId: 'user123',
      subject: 'Chemistry',
      topic: 'Periodic Table',
      description: 'Elements and their properties',
      sections: [],
      keyTerms: [],
      practiceQuestions: [],
      createdAt: '2024-01-02T00:00:00.000Z',
      lastModified: '2024-01-02T00:00:00.000Z',
    };
    vi.mocked(api.createStudyGuide).mockResolvedValue(newGuide);

    render(<StudyGuides />);

    await waitFor(() => screen.getByText('+ New Study Guide'));
    fireEvent.click(screen.getByText('+ New Study Guide'));

    const subjectInput = screen.getByPlaceholderText('Subject');
    fireEvent.change(subjectInput, { target: { value: 'Chemistry' } });

    const topicInput = screen.getByPlaceholderText('Topic');
    fireEvent.change(topicInput, { target: { value: 'Periodic Table' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createStudyGuide).toHaveBeenCalled();
    });
  });

  it('adds a key term to study guide', async () => {
    const updatedGuide = {
      ...mockGuides[0],
      keyTerms: [
        ...mockGuides[0].keyTerms,
        {
          term: 'Nucleus',
          definition: 'Control center of the cell',
          examples: ['Contains DNA'],
          category: 'organelles',
        },
      ],
    };
    vi.mocked(api.addKeyTerm).mockResolvedValue(updatedGuide);

    render(<StudyGuides />);

    await waitFor(() => screen.getByText('Cell Structure'));
    fireEvent.click(screen.getByText('Cell Structure'));

    await waitFor(() => screen.getByText('+ Add Key Term'));
    fireEvent.click(screen.getByText('+ Add Key Term'));

    const termInput = screen.getByPlaceholderText('Term');
    fireEvent.change(termInput, { target: { value: 'Nucleus' } });

    const defInput = screen.getByPlaceholderText('Definition');
    fireEvent.change(defInput, { target: { value: 'Control center of the cell' } });

    fireEvent.click(screen.getByText('Add Term'));

    await waitFor(() => {
      expect(api.addKeyTerm).toHaveBeenCalled();
    });
  });

  it('adds a practice question to study guide', async () => {
    const newQuestion: api.PracticeQuestion = {
      id: 'q2',
      question: 'What organelle produces ATP?',
      type: 'shortAnswer',
      difficulty: 'easy',
      correctAnswer: 'Mitochondria',
    };
    const updatedGuide = {
      ...mockGuides[0],
      practiceQuestions: [...mockGuides[0].practiceQuestions, newQuestion],
    };
    vi.mocked(api.addPracticeQuestion).mockResolvedValue(updatedGuide);

    render(<StudyGuides />);

    await waitFor(() => screen.getByText('Cell Structure'));
    fireEvent.click(screen.getByText('Cell Structure'));

    await waitFor(() => screen.getByText('+ Add Practice Question'));
    fireEvent.click(screen.getByText('+ Add Practice Question'));

    const questionInput = screen.getByPlaceholderText('Question');
    fireEvent.change(questionInput, { target: { value: 'What organelle produces ATP?' } });

    fireEvent.click(screen.getByText('Add Question'));

    await waitFor(() => {
      expect(api.addPracticeQuestion).toHaveBeenCalled();
    });
  });

  it('deletes a study guide', async () => {
    vi.mocked(api.deleteStudyGuide).mockResolvedValue(undefined);
    global.confirm = vi.fn(() => true);

    render(<StudyGuides />);

    await waitFor(() => screen.getByText('Cell Structure'));
    fireEvent.click(screen.getByText('Cell Structure'));

    await waitFor(() => screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(api.deleteStudyGuide).toHaveBeenCalledWith('1');
    });
  });
});

describe('Study Skills - Memory Techniques', () => {
  const mockTechniques: api.MemoryTechnique[] = [
    {
      id: '1',
      userId: 'user123',
      name: 'HOMES Acronym',
      type: 'mnemonic',
      description: 'Remember the Great Lakes',
      steps: ['H = Huron', 'O = Ontario', 'M = Michigan', 'E = Erie', 'S = Superior'],
      examples: ['Great Lakes mnemonic'],
      effectiveness: 5,
      timesUsed: 12,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastUsed: '2024-01-15T00:00:00.000Z',
    },
  ];

  const mockCards: api.MemoryCard[] = [
    {
      id: '1',
      userId: 'user123',
      front: 'What is the capital of France?',
      back: 'Paris',
      subject: 'Geography',
      deck: 'European Capitals',
      correctCount: 5,
      incorrectCount: 2,
      lastReviewed: '2024-01-15T00:00:00.000Z',
      nextReview: '2024-01-20T00:00:00.000Z',
      difficulty: 'easy',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getMemoryTechniques).mockResolvedValue(mockTechniques);
    vi.mocked(api.getMemoryCards).mockResolvedValue(mockCards);
  });

  it('renders memory techniques and cards', async () => {
    render(<MemoryTechniques />);

    await waitFor(() => {
      expect(screen.getByText('HOMES Acronym')).toBeInTheDocument();
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    });
  });

  it('creates a new memory technique', async () => {
    const newTechnique: api.MemoryTechnique = {
      id: '2',
      userId: 'user123',
      name: 'Method of Loci',
      type: 'visualization',
      description: 'Memory palace technique',
      steps: ['Choose familiar location', 'Create mental images', 'Place items in locations'],
      examples: [],
      effectiveness: 4,
      timesUsed: 0,
      createdAt: '2024-01-02T00:00:00.000Z',
      lastUsed: undefined,
    };
    vi.mocked(api.createMemoryTechnique).mockResolvedValue(newTechnique);

    render(<MemoryTechniques />);

    await waitFor(() => screen.getByText('+ New Technique'));
    fireEvent.click(screen.getByText('+ New Technique'));

    const nameInput = screen.getByPlaceholderText('Technique Name');
    fireEvent.change(nameInput, { target: { value: 'Method of Loci' } });

    const descInput = screen.getByPlaceholderText('Description');
    fireEvent.change(descInput, { target: { value: 'Memory palace technique' } });

    const stepsInput = screen.getByPlaceholderText('Steps (one per line)');
    fireEvent.change(stepsInput, {
      target: { value: 'Choose familiar location\nCreate mental images\nPlace items in locations' },
    });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createMemoryTechnique).toHaveBeenCalled();
    });
  });

  it('creates a new memory card', async () => {
    const newCard: api.MemoryCard = {
      id: '2',
      userId: 'user123',
      front: 'What is the speed of light?',
      back: '299,792,458 m/s',
      subject: 'Physics',
      deck: 'Constants',
      correctCount: 0,
      incorrectCount: 0,
      lastReviewed: undefined,
      nextReview: new Date().toISOString(),
      difficulty: 'medium',
      createdAt: '2024-01-02T00:00:00.000Z',
    };
    vi.mocked(api.createMemoryCard).mockResolvedValue(newCard);

    render(<MemoryTechniques />);

    await waitFor(() => screen.getByText('+ New Card'));
    fireEvent.click(screen.getByText('+ New Card'));

    const frontInput = screen.getByPlaceholderText('Front (Question)');
    fireEvent.change(frontInput, { target: { value: 'What is the speed of light?' } });

    const backInput = screen.getByPlaceholderText('Back (Answer)');
    fireEvent.change(backInput, { target: { value: '299,792,458 m/s' } });

    const subjectInput = screen.getByPlaceholderText('Subject');
    fireEvent.change(subjectInput, { target: { value: 'Physics' } });

    const deckInput = screen.getByPlaceholderText('Deck Name');
    fireEvent.change(deckInput, { target: { value: 'Constants' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createMemoryCard).toHaveBeenCalled();
    });
  });

  it('starts review mode and reviews a card', async () => {
    const updatedCard = { ...mockCards[0], correctCount: 6 };
    vi.mocked(api.reviewMemoryCard).mockResolvedValue(updatedCard);

    render(<MemoryTechniques />);

    await waitFor(() => screen.getByText(/Start Review/));
    fireEvent.click(screen.getByText(/Start Review/));

    await waitFor(() => screen.getByText('Show Answer'));
    fireEvent.click(screen.getByText('Show Answer'));

    await waitFor(() => screen.getByText('✓ Correct'));
    fireEvent.click(screen.getByText('✓ Correct'));

    await waitFor(() => {
      expect(api.reviewMemoryCard).toHaveBeenCalledWith('1', true);
    });
  });

  it('filters cards by deck', async () => {
    render(<MemoryTechniques />);

    await waitFor(() => screen.getByText('What is the capital of France?'));

    const deckSelect = screen.getByRole('combobox');
    fireEvent.change(deckSelect, { target: { value: 'European Capitals' } });

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });
});

describe('Study Skills - Test Prep', () => {
  const mockPlans: api.TestPrepPlan[] = [
    {
      id: '1',
      userId: 'user123',
      testName: 'Final Exam',
      testDate: '2024-06-15',
      subject: 'Mathematics',
      description: 'Comprehensive final exam',
      studySessions: [
        {
          id: 's1',
          date: '2024-06-01',
          time: '14:00',
          duration: 60,
          topics: ['Algebra', 'Geometry'],
          isCompleted: false,
        },
      ],
      progress: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  const mockTests: api.PracticeTest[] = [
    {
      id: '1',
      userId: 'user123',
      name: 'Practice Test 1',
      subject: 'Mathematics',
      testPrepPlanId: '1',
      questions: [
        {
          id: 'q1',
          question: 'What is 2 + 2?',
          type: 'multipleChoice',
          difficulty: 'easy',
          options: ['3', '4', '5', '6'],
          correctAnswer: '4',
        },
      ],
      duration: 30,
      createdAt: '2024-01-01T00:00:00.000Z',
      completedAt: undefined,
      score: undefined,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getTestPrepPlans).mockResolvedValue(mockPlans);
    vi.mocked(api.getPracticeTests).mockResolvedValue(mockTests);
  });

  it('renders test prep plans', async () => {
    render(<TestPrep />);

    await waitFor(() => {
      expect(screen.getByText('Final Exam')).toBeInTheDocument();
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });
  });

  it('creates a new test prep plan', async () => {
    const newPlan: api.TestPrepPlan = {
      id: '2',
      userId: 'user123',
      testName: 'Midterm Exam',
      testDate: '2024-03-15',
      subject: 'History',
      description: 'World History midterm',
      studySessions: [],
      progress: 0,
      createdAt: '2024-01-02T00:00:00.000Z',
    };
    vi.mocked(api.createTestPrepPlan).mockResolvedValue(newPlan);

    render(<TestPrep />);

    await waitFor(() => screen.getByText('+ New Plan'));
    fireEvent.click(screen.getByText('+ New Plan'));

    const nameInput = screen.getByLabelText('Test Name');
    fireEvent.change(nameInput, { target: { value: 'Midterm Exam' } });

    const dateInput = screen.getByLabelText('Test Date');
    fireEvent.change(dateInput, { target: { value: '2024-03-15' } });

    const subjectInput = screen.getByLabelText('Subject');
    fireEvent.change(subjectInput, { target: { value: 'History' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createTestPrepPlan).toHaveBeenCalled();
    });
  });

  it('completes a study session', async () => {
    const updatedPlan = {
      ...mockPlans[0],
      studySessions: [{ ...mockPlans[0].studySessions[0], isCompleted: true }],
      progress: 100,
    };
    vi.mocked(api.completeStudySession).mockResolvedValue(updatedPlan);

    render(<TestPrep />);

    await waitFor(() => screen.getByText('Final Exam'));
    fireEvent.click(screen.getByText('Final Exam'));

    await waitFor(() => screen.getByText('Complete'));
    fireEvent.click(screen.getByText('Complete'));

    await waitFor(() => {
      expect(api.completeStudySession).toHaveBeenCalledWith('1', 's1');
    });
  });

  it('starts and submits a practice test', async () => {
    const results = {
      test: { ...mockTests[0], score: 100, completedAt: '2024-01-15T00:00:00.000Z' },
      analytics: {
        totalQuestions: 1,
        correctAnswers: 1,
        incorrectAnswers: 0,
        strongTopics: ['Basic Math'],
        weakTopics: [],
        recommendedFocus: [],
      },
    };
    vi.mocked(api.submitPracticeTest).mockResolvedValue(results);

    render(<TestPrep />);

    await waitFor(() => screen.getByText('Final Exam'));
    fireEvent.click(screen.getByText('Final Exam'));

    await waitFor(() => screen.getByText('Start Test'));
    fireEvent.click(screen.getByText('Start Test'));

    await waitFor(() => screen.getByText('What is 2 + 2?'));
    const option = screen.getByLabelText('4');
    fireEvent.click(option);

    fireEvent.click(screen.getByText('Submit Test'));

    await waitFor(() => {
      expect(api.submitPracticeTest).toHaveBeenCalled();
      expect(screen.getByText('Test Results')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  it('deletes a test prep plan', async () => {
    vi.mocked(api.deleteTestPrepPlan).mockResolvedValue(undefined);
    global.confirm = vi.fn(() => true);

    render(<TestPrep />);

    await waitFor(() => screen.getByText('Final Exam'));
    fireEvent.click(screen.getByText('Final Exam'));

    await waitFor(() => screen.getByText('Delete'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(api.deleteTestPrepPlan).toHaveBeenCalledWith('1');
    });
  });
});
