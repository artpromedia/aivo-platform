import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VocabularyBuilder } from '../app/(learning)/reading-tools/components/VocabularyBuilder';
import * as readingApi from '../lib/reading-api';

// Mock the reading API
vi.mock('../lib/reading-api');

const mockLists = [
  {
    id: 'list-1',
    learnerId: 'learner-123',
    name: 'Science Vocabulary',
    description: 'Terms from biology class',
    words: [
      {
        id: 'word-1',
        word: 'photosynthesis',
        definition: 'The process by which green plants make food using sunlight',
        partOfSpeech: 'noun',
        example: 'Plants use photosynthesis to convert light energy into chemical energy.',
        synonyms: [],
      },
      {
        id: 'word-2',
        word: 'ecosystem',
        definition: 'A biological community of interacting organisms and their environment',
        partOfSpeech: 'noun',
        example: 'The rainforest is a complex ecosystem.',
        synonyms: ['habitat', 'environment'],
      },
    ],
    createdAt: '2024-01-15T10:00:00Z',
  },
];

const mockSearchResults = [
  {
    id: 'word-3',
    word: 'mitochondria',
    definition: 'An organelle found in cells that produces energy',
    partOfSpeech: 'noun',
    example: 'Mitochondria are often called the powerhouse of the cell.',
    synonyms: [],
  },
];

const mockProgress = {
  totalWords: 15,
  masteredWords: 8,
  overallAccuracy: 0.73,
  recentActivity: [
    {
      listName: 'Science Vocabulary',
      date: '2024-01-20',
      score: 85,
      correctAnswers: 17,
      totalQuestions: 20,
    },
  ],
};

describe('VocabularyBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readingApi.getVocabularyLists).mockResolvedValue(mockLists);
    vi.mocked(readingApi.searchWords).mockResolvedValue(mockSearchResults);
    vi.mocked(readingApi.getVocabularyProgress).mockResolvedValue(mockProgress);
    vi.mocked(readingApi.createVocabularyList).mockResolvedValue({
      ...mockLists[0],
      id: 'list-new',
      name: 'New List',
      words: [],
    });
    vi.mocked(readingApi.addWordToList).mockResolvedValue(mockLists[0]);
    vi.mocked(readingApi.submitFlashcardResults).mockResolvedValue(undefined);
  });

  it('should render vocabulary builder component', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Vocabulary Lists')).toBeInTheDocument();
    });
  });

  it('should load vocabulary lists on mount', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      expect(readingApi.getVocabularyLists).toHaveBeenCalledWith('learner-123');
      expect(screen.getByText('Science Vocabulary')).toBeInTheDocument();
    });
  });

  it('should display list words', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('photosynthesis')).toBeInTheDocument();
      expect(screen.getByText('ecosystem')).toBeInTheDocument();
    });
  });

  it('should show create new list form', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      const newButton = screen.getByText('+ New');
      fireEvent.click(newButton);
    });

    expect(screen.getByPlaceholderText('List name')).toBeInTheDocument();
  });

  it('should create new vocabulary list', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      const newButton = screen.getByText('+ New');
      fireEvent.click(newButton);
    });

    const nameInput = screen.getByPlaceholderText('List name');
    const descInput = screen.getByPlaceholderText('Description (optional)');
    fireEvent.change(nameInput, { target: { value: 'New List' } });
    fireEvent.change(descInput, { target: { value: 'Test description' } });

    const createButton = screen.getByText('Create');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(readingApi.createVocabularyList).toHaveBeenCalledWith({
        learnerId: 'learner-123',
        name: 'New List',
        description: 'Test description',
      });
    });
  });

  it('should switch to search tab', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      const searchTab = screen.getByText('🔍 Search Words');
      fireEvent.click(searchTab);
    });

    expect(screen.getByPlaceholderText(/enter a word to search/i)).toBeInTheDocument();
  });

  it('should search for words', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      const searchTab = screen.getByText('🔍 Search Words');
      fireEvent.click(searchTab);
    });

    const searchInput = screen.getByPlaceholderText(/enter a word to search/i);
    fireEvent.change(searchInput, { target: { value: 'mitochondria' } });

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(readingApi.searchWords).toHaveBeenCalledWith('mitochondria');
      expect(screen.getByText('mitochondria')).toBeInTheDocument();
    });
  });

  it('should add word to list', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    // Switch to search tab
    await waitFor(() => {
      const searchTab = screen.getByText('🔍 Search Words');
      fireEvent.click(searchTab);
    });

    // Search for word
    const searchInput = screen.getByPlaceholderText(/enter a word to search/i);
    fireEvent.change(searchInput, { target: { value: 'mitochondria' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      const addButton = screen.getByText('+ Add to List');
      fireEvent.click(addButton);
    });

    await waitFor(() => {
      expect(readingApi.addWordToList).toHaveBeenCalledWith('list-1', 'word-3');
    });
  });

  it('should show progress tab', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      const progressTab = screen.getByText('📊 Progress');
      fireEvent.click(progressTab);
    });

    await waitFor(() => {
      expect(readingApi.getVocabularyProgress).toHaveBeenCalledWith('learner-123');
      expect(screen.getByText('15')).toBeInTheDocument(); // Total words
      expect(screen.getByText('8')).toBeInTheDocument(); // Mastered words
      expect(screen.getByText('73%')).toBeInTheDocument(); // Accuracy
    });
  });

  it('should start flashcard practice', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      const practiceButton = screen.getByText(/practice flashcards/i);
      fireEvent.click(practiceButton);
    });

    expect(screen.getByText('Flashcard Practice')).toBeInTheDocument();
    expect(screen.getByText('photosynthesis')).toBeInTheDocument();
  });

  it('should navigate flashcards', async () => {
    render(<VocabularyBuilder learnerId="learner-123" />);
    
    await waitFor(() => {
      const practiceButton = screen.getByText(/practice flashcards/i);
      fireEvent.click(practiceButton);
    });

    // Click to reveal answer
    const flashcard = screen.getByText('photosynthesis').closest('div');
    if (flashcard) {
      fireEvent.click(flashcard);
    }

    await waitFor(() => {
      expect(screen.getByText(/the process by which green plants/i)).toBeInTheDocument();
    });

    // Mark as correct
    const gotItButton = screen.getByText(/got it!/i);
    fireEvent.click(gotItButton);

    await waitFor(() => {
      expect(screen.getByText('ecosystem')).toBeInTheDocument();
    });
  });
});
