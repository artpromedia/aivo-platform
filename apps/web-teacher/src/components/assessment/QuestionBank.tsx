'use client';

/**
 * QuestionBank Component
 *
 * Searchable library of pre-made questions that can be added to assessments
 * Filters by subject, grade level, type, and difficulty
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Search, Filter, Plus, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { assessmentsApi } from '@/lib/api/assessments';
import type { QuestionBankItem, QuestionType, Question } from '@/lib/types';

interface QuestionBankProps {
  subject?: string;
  gradeLevel?: string;
  onAddQuestion: (question: Omit<Question, 'id' | 'order'>) => void;
  className?: string;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  'multiple-choice': 'Multiple Choice',
  'true-false': 'True/False',
  'short-answer': 'Short Answer',
  essay: 'Essay',
  math: 'Math',
  matching: 'Matching',
  'fill-in-blank': 'Fill in Blank',
  ordering: 'Ordering',
};

const MOCK_QUESTIONS: QuestionBankItem[] = [
  {
    id: '1',
    type: 'multiple-choice',
    text: 'What is the capital of France?',
    points: 1,
    options: [
      { id: 'a', text: 'London', isCorrect: false },
      { id: 'b', text: 'Paris', isCorrect: true },
      { id: 'c', text: 'Berlin', isCorrect: false },
      { id: 'd', text: 'Madrid', isCorrect: false },
    ],
    correctAnswer: 'b',
    subject: 'Social Studies',
    gradeLevel: '4th Grade',
    difficulty: 'easy',
    usageCount: 245,
    averageScore: 0.87,
    createdBy: 'system',
    isPublic: true,
    createdAt: new Date(),
    tags: ['geography', 'europe', 'capitals'],
  },
  {
    id: '2',
    type: 'math',
    text: 'Solve for x: 2x + 5 = 15',
    points: 2,
    correctAnswer: '5',
    subject: 'Mathematics',
    gradeLevel: '6th Grade',
    difficulty: 'medium',
    usageCount: 189,
    averageScore: 0.72,
    createdBy: 'system',
    isPublic: true,
    createdAt: new Date(),
    tags: ['algebra', 'equations', 'linear'],
  },
  {
    id: '3',
    type: 'true-false',
    text: 'The sun rises in the west.',
    points: 1,
    correctAnswer: false,
    subject: 'Science',
    gradeLevel: '3rd Grade',
    difficulty: 'easy',
    usageCount: 312,
    averageScore: 0.94,
    createdBy: 'system',
    isPublic: true,
    createdAt: new Date(),
    tags: ['astronomy', 'earth', 'sun'],
  },
  {
    id: '4',
    type: 'short-answer',
    text: 'What is the process by which plants make their own food using sunlight?',
    points: 2,
    expectedAnswer: 'photosynthesis',
    subject: 'Science',
    gradeLevel: '5th Grade',
    difficulty: 'medium',
    usageCount: 156,
    averageScore: 0.68,
    createdBy: 'system',
    isPublic: true,
    createdAt: new Date(),
    tags: ['biology', 'plants', 'photosynthesis'],
  },
  {
    id: '5',
    type: 'multiple-choice',
    text: 'Which of the following is a prime number?',
    points: 1,
    options: [
      { id: 'a', text: '4', isCorrect: false },
      { id: 'b', text: '9', isCorrect: false },
      { id: 'c', text: '17', isCorrect: true },
      { id: 'd', text: '21', isCorrect: false },
    ],
    correctAnswer: 'c',
    subject: 'Mathematics',
    gradeLevel: '5th Grade',
    difficulty: 'medium',
    usageCount: 203,
    averageScore: 0.65,
    createdBy: 'system',
    isPublic: true,
    createdAt: new Date(),
    tags: ['numbers', 'prime', 'arithmetic'],
  },
];

export function QuestionBank({ subject, gradeLevel, onAddQuestion, className }: QuestionBankProps) {
  const [questions, setQuestions] = React.useState<QuestionBankItem[]>(MOCK_QUESTIONS);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [filters, setFilters] = React.useState({
    type: '' as QuestionType | '',
    difficulty: '' as 'easy' | 'medium' | 'hard' | '',
  });
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Fetch questions when filters change
  React.useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const result = await assessmentsApi.searchQuestionBank({
          subject: subject || undefined,
          gradeLevel: gradeLevel || undefined,
          type: filters.type || undefined,
          difficulty: filters.difficulty || undefined,
          search: search || undefined,
        });
        setQuestions(result);
      } catch {
        // Fallback to mock data if API fails
        let filtered = MOCK_QUESTIONS;

        if (subject) {
          filtered = filtered.filter((q) => q.subject === subject);
        }
        if (gradeLevel) {
          filtered = filtered.filter((q) => q.gradeLevel === gradeLevel);
        }
        if (filters.type) {
          filtered = filtered.filter((q) => q.type === filters.type);
        }
        if (filters.difficulty) {
          filtered = filtered.filter((q) => q.difficulty === filters.difficulty);
        }
        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(
            (q) =>
              q.text.toLowerCase().includes(searchLower) ||
              q.tags?.some((t) => t.toLowerCase().includes(searchLower))
          );
        }

        setQuestions(filtered);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchQuestions, 300);
    return () => clearTimeout(debounce);
  }, [subject, gradeLevel, filters, search]);

  const handleAddQuestion = (question: QuestionBankItem) => {
    const { id, subject: _s, gradeLevel: _g, usageCount: _u, averageScore: _a, createdBy: _c, isPublic: _p, createdAt: _d, ...questionData } = question;
    onAddQuestion(questionData);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-lg overflow-hidden', className)}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-bold text-lg text-gray-900 mb-3">Question Bank</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="filter-type" className="block text-xs font-medium text-gray-500 mb-1">
                Type
              </label>
              <select
                id="filter-type"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as QuestionType | '' })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-difficulty" className="block text-xs font-medium text-gray-500 mb-1">
                Difficulty
              </label>
              <select
                id="filter-difficulty"
                value={filters.difficulty}
                onChange={(e) =>
                  setFilters({ ...filters, difficulty: e.target.value as 'easy' | 'medium' | 'hard' | '' })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>No questions found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {questions.map((question) => (
              <div
                key={question.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion(question)}
                    className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex-shrink-0"
                    title="Add to assessment"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
                      className="w-full text-left"
                    >
                      <p className="text-sm text-gray-900 line-clamp-2">{question.text}</p>
                    </button>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {QUESTION_TYPE_LABELS[question.type]}
                      </span>
                      {question.difficulty && (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded capitalize',
                            getDifficultyColor(question.difficulty)
                          )}
                        >
                          {question.difficulty}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{question.points} pts</span>
                      {question.usageCount > 100 && (
                        <span className="flex items-center gap-1 text-xs text-yellow-600">
                          <Star className="w-3 h-3 fill-current" />
                          Popular
                        </span>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {expandedId === question.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                        {question.averageScore !== undefined && (
                          <p className="text-gray-500">
                            Avg. Score: <span className="font-medium">{Math.round(question.averageScore * 100)}%</span>
                          </p>
                        )}
                        {question.tags && question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {question.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
