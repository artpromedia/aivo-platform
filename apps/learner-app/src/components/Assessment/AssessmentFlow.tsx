'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  AssessmentFlowProps,
  AssessmentPhase,
  AssessmentQuestion,
  DomainInfo,
  DomainScore,
  LearningStyleQuestion,
  AssessmentResult,
} from './types';

// Domain definitions
const ASSESSMENT_DOMAINS: DomainInfo[] = [
  {
    id: 'MATH',
    name: 'Math Adventures',
    emoji: '🔢',
    description: 'Numbers, patterns, and problem solving!',
    color: 'from-blue-400 to-blue-600',
  },
  {
    id: 'ELA',
    name: 'Reading & Writing',
    emoji: '📚',
    description: 'Stories, words, and communication!',
    color: 'from-purple-400 to-purple-600',
  },
  {
    id: 'SPEECH',
    name: 'Speaking Skills',
    emoji: '🎤',
    description: 'Express yourself clearly!',
    color: 'from-pink-400 to-pink-600',
  },
  {
    id: 'SEL',
    name: 'Social & Emotional',
    emoji: '💖',
    description: 'Understanding feelings and relationships!',
    color: 'from-red-400 to-red-600',
  },
  {
    id: 'SPELLING',
    name: 'Spelling Bee',
    emoji: '🐝',
    description: 'Words and their correct spellings!',
    color: 'from-yellow-400 to-yellow-600',
  },
  {
    id: 'CREATIVE_WRITING',
    name: 'Creative Writing',
    emoji: '✨',
    description: 'Let your imagination flow!',
    color: 'from-teal-400 to-teal-600',
  },
  {
    id: 'LIFE_SKILLS',
    name: 'Life Skills',
    emoji: '🌟',
    description: 'Real-world knowledge!',
    color: 'from-green-400 to-green-600',
  },
];

// Learning style questions
const LEARNING_STYLE_QUESTIONS: LearningStyleQuestion[] = [
  {
    id: 'ls_1',
    question: 'When you learn something new, what helps you remember it best?',
    options: [
      { value: 'visual', label: 'Pictures and diagrams', emoji: '🖼️' },
      { value: 'auditory', label: 'Hearing it explained', emoji: '👂' },
      { value: 'kinesthetic', label: 'Trying it myself', emoji: '🤲' },
      { value: 'reading', label: 'Reading about it', emoji: '📖' },
    ],
  },
  {
    id: 'ls_2',
    question: 'What kind of activities do you enjoy most?',
    options: [
      { value: 'creative', label: 'Art and creating', emoji: '🎨' },
      { value: 'logical', label: 'Puzzles and problems', emoji: '🧩' },
      { value: 'social', label: 'Working with others', emoji: '👥' },
      { value: 'independent', label: 'Working alone', emoji: '🧘' },
    ],
  },
  {
    id: 'ls_3',
    question: 'When you have free time, what do you like to do?',
    options: [
      { value: 'games', label: 'Play games', emoji: '🎮' },
      { value: 'reading', label: 'Read books', emoji: '📚' },
      { value: 'sports', label: 'Sports or outdoor activities', emoji: '⚽' },
      { value: 'music', label: 'Listen to or make music', emoji: '🎵' },
    ],
    multiSelect: true,
  },
];

// Game break activities
const GAME_BREAKS = [
  { emoji: '🎈', title: 'Balloon Breath!', instruction: 'Take a deep breath in... now blow up an imaginary balloon!', duration: 8 },
  { emoji: '💃', title: 'Shake It Out!', instruction: 'Stand up and shake your arms and legs for 10 seconds!', duration: 10 },
  { emoji: '⭐', title: 'Star Gazing', instruction: "Close your eyes and imagine you're looking at stars in the sky...", duration: 8 },
  { emoji: '🎉', title: 'Dance Party!', instruction: 'Do your favorite dance move! You earned it!', duration: 8 },
];

const QUESTIONS_PER_DOMAIN = 5;

export function AssessmentFlow({
  sessionId,
  onSubmitAnswer,
  onComplete,
  className = '',
}: AssessmentFlowProps) {
  const [phase, setPhase] = useState<AssessmentPhase>('learning_style');
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [learningStyleIndex, setLearningStyleIndex] = useState(0);
  const [learningStyleAnswers, setLearningStyleAnswers] = useState<Record<string, string | string[]>>({});
  const [domainScores, setDomainScores] = useState<DomainScore[]>([]);
  const [currentDomainCorrect, setCurrentDomainCorrect] = useState(0);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [breakCountdown, setBreakCountdown] = useState(0);

  const currentDomain = ASSESSMENT_DOMAINS[currentDomainIndex];
  const currentQuestion = questions[currentQuestionIndex];
  const currentBreak = GAME_BREAKS[currentDomainIndex % GAME_BREAKS.length];
  const currentLearningStyleQuestion = LEARNING_STYLE_QUESTIONS[learningStyleIndex];

  // Fetch questions for current domain
  const fetchDomainQuestions = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assessment/${sessionId}/questions?domain=${currentDomain.id}`
      );
      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      // Use placeholder questions for demo
      setQuestions(generatePlaceholderQuestions(currentDomain.id));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentDomain?.id]);

  // Generate placeholder questions for demo
  const generatePlaceholderQuestions = (domain: string): AssessmentQuestion[] => {
    return Array.from({ length: QUESTIONS_PER_DOMAIN }, (_, i) => ({
      id: `${domain}_q${i + 1}`,
      domain: domain as AssessmentQuestion['domain'],
      skillCode: `${domain}_SKILL_${i + 1}`,
      questionType: 'MULTIPLE_CHOICE' as const,
      questionText: `Sample ${domain} question ${i + 1}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      difficulty: 3,
      questionNumber: i + 1,
    }));
  };

  // Handle break countdown
  useEffect(() => {
    if (phase === 'game_break' && breakCountdown > 0) {
      const timer = setTimeout(() => setBreakCountdown(breakCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'game_break' && breakCountdown === 0) {
      // Auto-advance after break
      handleSkipBreak();
    }
  }, [phase, breakCountdown]);

  // Handle learning style answer
  const handleLearningStyleAnswer = (value: string | string[]) => {
    const question = LEARNING_STYLE_QUESTIONS[learningStyleIndex];
    setLearningStyleAnswers(prev => ({
      ...prev,
      [question.id]: value,
    }));

    if (learningStyleIndex < LEARNING_STYLE_QUESTIONS.length - 1) {
      setLearningStyleIndex(learningStyleIndex + 1);
    } else {
      setPhase('transition_to_domains');
      setTimeout(() => {
        setPhase('domain_intro');
      }, 2000);
    }
  };

  // Handle domain question answer
  const handleAnswer = async (optionIndex: number) => {
    if (!sessionId || !currentQuestion) return;

    try {
      await onSubmitAnswer(sessionId, currentQuestion.id, optionIndex);

      // Track correct answers (simulated - in real app would come from API)
      const isCorrect = Math.random() > 0.3; // Placeholder
      if (isCorrect) {
        setCurrentDomainCorrect(prev => prev + 1);
      }

      if (currentQuestionIndex < QUESTIONS_PER_DOMAIN - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // Domain complete
        const score: DomainScore = {
          domain: currentDomain.id,
          score: (currentDomainCorrect / QUESTIONS_PER_DOMAIN) * 100,
          totalQuestions: QUESTIONS_PER_DOMAIN,
          correctAnswers: currentDomainCorrect,
        };
        setDomainScores(prev => [...prev, score]);
        setCurrentDomainCorrect(0);
        setCurrentQuestionIndex(0);

        if (currentDomainIndex < ASSESSMENT_DOMAINS.length - 1) {
          setPhase('game_break');
          setBreakCountdown(currentBreak.duration);
        } else {
          // Assessment complete
          handleAssessmentComplete([...domainScores, score]);
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  // Handle starting a domain
  const handleStartDomain = () => {
    setPhase('domain_questions');
    fetchDomainQuestions();
  };

  // Handle skipping break
  const handleSkipBreak = () => {
    setCurrentDomainIndex(currentDomainIndex + 1);
    setPhase('domain_intro');
  };

  // Handle assessment completion
  const handleAssessmentComplete = async (finalScores: DomainScore[]) => {
    setPhase('completing');

    const results: AssessmentResult = {
      id: sessionId || 'unknown',
      learnerId: localStorage.getItem('user_id') || 'unknown',
      completedAt: new Date().toISOString(),
      learningStyleAnswers,
      domainScores: finalScores,
    };

    try {
      await onComplete(results);
    } catch (error) {
      console.error('Failed to complete assessment:', error);
    }
  };

  // Calculate overall progress
  const calculateProgress = (): number => {
    const learningStyleProgress = (learningStyleIndex / LEARNING_STYLE_QUESTIONS.length) * 20;
    const domainProgress = (currentDomainIndex / ASSESSMENT_DOMAINS.length) * 80;
    const questionProgress = (currentQuestionIndex / QUESTIONS_PER_DOMAIN) * (80 / ASSESSMENT_DOMAINS.length);

    if (phase === 'learning_style') {
      return learningStyleProgress;
    }
    return 20 + domainProgress + questionProgress;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={`flex min-h-[400px] items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-purple-100">
            <span className="text-4xl">{currentDomain?.emoji}</span>
          </div>
          <p className="text-lg text-gray-600">Getting your questions ready...</p>
        </div>
      </div>
    );
  }

  // Render learning style phase
  if (phase === 'learning_style' && currentLearningStyleQuestion) {
    return (
      <div className={`mx-auto max-w-xl ${className}`}>
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Getting to know you...</span>
            <span>{Math.round(calculateProgress())}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-teal-500 transition-all duration-500"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">🤔</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {currentLearningStyleQuestion.question}
            </h2>
            {currentLearningStyleQuestion.multiSelect && (
              <p className="text-gray-500">You can pick more than one!</p>
            )}
          </div>

          <div className="space-y-3">
            {currentLearningStyleQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleLearningStyleAnswer(option.value)}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center gap-4 text-left"
              >
                <span className="text-3xl">{option.emoji}</span>
                <span className="text-lg font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render transition to domains
  if (phase === 'transition_to_domains') {
    return (
      <div className={`flex min-h-[400px] items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-32 w-32 animate-bounce items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-teal-400">
            <span className="text-6xl">🚀</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Awesome!</h2>
          <p className="text-lg text-gray-600">Now let&apos;s see what you know!</p>
        </div>
      </div>
    );
  }

  // Render domain intro
  if (phase === 'domain_intro') {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="mx-auto max-w-xl text-center">
          <div
            className={`mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full shadow-lg bg-gradient-to-br ${currentDomain.color}`}
          >
            <span className="text-6xl">{currentDomain.emoji}</span>
          </div>
          <h2 className="mb-3 text-3xl font-bold text-gray-800">
            {currentDomain.name}
          </h2>
          <p className="mb-2 text-lg text-gray-600">
            {currentDomain.description}
          </p>
          <div className="mb-6 inline-block rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-600">
            {QUESTIONS_PER_DOMAIN} quick questions
          </div>

          <button
            onClick={handleStartDomain}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 px-6 py-4 text-xl font-bold text-white transition-all hover:opacity-90"
          >
            Start! ✨
          </button>
        </div>

        {/* Domain progress indicator */}
        <div className="flex justify-center gap-2">
          {ASSESSMENT_DOMAINS.map((domain, idx) => (
            <div
              key={domain.id}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                idx < currentDomainIndex
                  ? 'bg-teal-400 text-white'
                  : idx === currentDomainIndex
                    ? 'bg-purple-500 text-white ring-4 ring-purple-200'
                    : 'border-2 border-gray-200 bg-white text-gray-400'
              }`}
            >
              {idx < currentDomainIndex ? '✓' : <span className="text-lg">{domain.emoji}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render domain questions
  if (phase === 'domain_questions' && currentQuestion) {
    return (
      <div className={`mx-auto max-w-xl ${className}`}>
        {/* Question header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${currentDomain.color}`}>
              <span className="text-xl">{currentDomain.emoji}</span>
            </div>
            <span className="font-medium text-gray-700">{currentDomain.name}</span>
          </div>
          <span className="text-sm text-gray-500">
            {currentQuestionIndex + 1} of {QUESTIONS_PER_DOMAIN}
          </span>
        </div>

        {/* Question progress */}
        <div className="mb-6 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${currentDomain.color} transition-all duration-300`}
            style={{ width: `${((currentQuestionIndex + 1) / QUESTIONS_PER_DOMAIN) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            {currentQuestion.questionText}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left font-medium"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 mr-3 text-sm">
                  {String.fromCharCode(65 + idx)}
                </span>
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render game break
  if (phase === 'game_break') {
    const remainingDomains = ASSESSMENT_DOMAINS.length - currentDomainIndex - 1;
    return (
      <div className={`mx-auto max-w-xl ${className}`}>
        <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl p-8 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-white shadow-lg">
            <span className="text-5xl">{currentBreak.emoji}</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {currentBreak.title}
          </h2>
          <p className="text-lg text-gray-600 mb-4">
            {currentBreak.instruction}
          </p>

          <div className="text-4xl font-bold text-orange-500 mb-6">
            {breakCountdown}s
          </div>

          <p className="text-gray-600 mb-4">
            🎉 You completed {currentDomain.name}! {remainingDomains} more to go!
          </p>

          <button
            onClick={handleSkipBreak}
            className="text-gray-500 underline hover:text-gray-700"
          >
            Skip break →
          </button>
        </div>
      </div>
    );
  }

  // Render completing
  if (phase === 'completing') {
    return (
      <div className={`flex min-h-[400px] items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-32 w-32 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-purple-500 shadow-lg">
            <span className="text-6xl">🧠</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            Amazing work! 🌟
          </h2>
          <p className="text-lg text-gray-600">
            Preparing your personalized learning brain...
          </p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="h-3 w-3 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: '0ms' }} />
            <div className="h-3 w-3 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: '150ms' }} />
            <div className="h-3 w-3 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
