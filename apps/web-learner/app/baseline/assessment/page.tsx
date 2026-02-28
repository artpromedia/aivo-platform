'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

import { type AssessmentDomain, type AssessmentQuestion } from './types';

const STORAGE_KEY = 'aivo_baseline_progress';

// ══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT CONFIGURATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

type AssessmentType = 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';
type GradeBand = 'PRE_K' | 'K_2' | 'GRADE_3_5' | 'GRADE_6_8' | 'GRADE_9_12';

interface DomainConfig {
  domain: string;
  name: string;
  icon: string;
  questionsPerDomain: number;
  enabled: boolean;
  order: number;
}

interface AssessmentConfig {
  assessmentType: AssessmentType;
  gradeBand: GradeBand;
  gradeLevel: string;
  domains: DomainConfig[];
  estimatedDurationMinutes: number;
  questionsPerDomain: number;
  totalQuestions: number;
  accommodations: {
    extendedTime: boolean;
    frequentBreaks: boolean;
    simplifiedLanguage: boolean;
    visualSupports: boolean;
    audioNarration: boolean;
    reducedOptions: boolean;
    largerText: boolean;
    caregiverAssisted: boolean;
  };
  uiConfig: {
    showTimer: boolean;
    allowSkip: boolean;
    showProgress: boolean;
    breakFrequency: number;
    optionCount: number;
    fontSizeMultiplier: number;
    highContrast: boolean;
    animationsEnabled: boolean;
  };
  introMessage: string;
  completionMessage: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG (fallback)
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: AssessmentConfig = {
  assessmentType: 'STANDARD',
  gradeBand: 'K_2',
  gradeLevel: '1',
  domains: [
    { domain: 'MATH', name: 'Math', icon: '🔢', questionsPerDomain: 5, enabled: true, order: 1 },
    {
      domain: 'ELA',
      name: 'Reading & Language',
      icon: '📚',
      questionsPerDomain: 5,
      enabled: true,
      order: 2,
    },
    {
      domain: 'SPELLING',
      name: 'Spelling',
      icon: '✏️',
      questionsPerDomain: 5,
      enabled: true,
      order: 3,
    },
    {
      domain: 'SPEECH',
      name: 'Speech & Language',
      icon: '🗣️',
      questionsPerDomain: 5,
      enabled: true,
      order: 4,
    },
    {
      domain: 'CREATIVE_WRITING',
      name: 'Creative Writing',
      icon: '✨',
      questionsPerDomain: 5,
      enabled: true,
      order: 5,
    },
    {
      domain: 'SEL',
      name: 'Social-Emotional',
      icon: '💚',
      questionsPerDomain: 5,
      enabled: true,
      order: 6,
    },
    {
      domain: 'LIFE_SKILLS',
      name: 'Life Skills',
      icon: '🌟',
      questionsPerDomain: 5,
      enabled: true,
      order: 7,
    },
  ],
  estimatedDurationMinutes: 35,
  questionsPerDomain: 5,
  totalQuestions: 35,
  accommodations: {
    extendedTime: false,
    frequentBreaks: false,
    simplifiedLanguage: false,
    visualSupports: false,
    audioNarration: false,
    reducedOptions: false,
    largerText: false,
    caregiverAssisted: false,
  },
  uiConfig: {
    showTimer: true,
    allowSkip: false,
    showProgress: true,
    breakFrequency: 10,
    optionCount: 4,
    fontSizeMultiplier: 1.0,
    highContrast: false,
    animationsEnabled: true,
  },
  introMessage: "Let's find out what you already know! 🚀",
  completionMessage: 'Amazing job! 🎉',
};

// ══════════════════════════════════════════════════════════════════════════════
// PHASE 1: Learning Style Questions (existing 7 questions)
// ══════════════════════════════════════════════════════════════════════════════

interface LearningStyleQuestion {
  id: string;
  category: 'learning_style' | 'interests' | 'strengths' | 'challenges' | 'preferences';
  emoji: string;
  question: string;
  type: 'choice' | 'emoji_scale' | 'multi_select';
  options: { value: string; label: string; emoji?: string }[];
}

const LEARNING_STYLE_QUESTIONS: LearningStyleQuestion[] = [
  {
    id: 'ls-1',
    category: 'learning_style',
    emoji: '📚',
    question: 'When learning something new, I like to...',
    type: 'choice',
    options: [
      { value: 'watch', label: 'Watch videos or pictures', emoji: '🎬' },
      { value: 'listen', label: 'Listen to someone explain it', emoji: '🎧' },
      { value: 'read', label: 'Read about it', emoji: '📖' },
      { value: 'hands_on', label: 'Try it myself', emoji: '🖐️' },
    ],
  },
  {
    id: 'ls-2',
    category: 'learning_style',
    emoji: '🧠',
    question: 'I remember things best when...',
    type: 'choice',
    options: [
      { value: 'pictures', label: 'I see pictures or diagrams', emoji: '🖼️' },
      { value: 'songs', label: "There's a song or rhyme", emoji: '🎵' },
      { value: 'write', label: 'I write it down', emoji: '✏️' },
      { value: 'move', label: 'I can move around while learning', emoji: '🏃' },
    ],
  },
  {
    id: 'int-1',
    category: 'interests',
    emoji: '⭐',
    question: 'What subjects do you like? (Pick all that apply!)',
    type: 'multi_select',
    options: [
      { value: 'math', label: 'Math', emoji: '🔢' },
      { value: 'reading', label: 'Reading', emoji: '📚' },
      { value: 'science', label: 'Science', emoji: '🔬' },
      { value: 'art', label: 'Art', emoji: '🎨' },
      { value: 'music', label: 'Music', emoji: '🎵' },
      { value: 'pe', label: 'Sports/PE', emoji: '⚽' },
      { value: 'games', label: 'Games', emoji: '🎮' },
    ],
  },
  {
    id: 'str-1',
    category: 'strengths',
    emoji: '💪',
    question: 'I feel really good at...',
    type: 'multi_select',
    options: [
      { value: 'solving_puzzles', label: 'Solving puzzles', emoji: '🧩' },
      { value: 'being_creative', label: 'Being creative', emoji: '🎨' },
      { value: 'helping_others', label: 'Helping friends', emoji: '🤝' },
      { value: 'building', label: 'Building things', emoji: '🏗️' },
      { value: 'telling_stories', label: 'Telling stories', emoji: '📖' },
      { value: 'sports', label: 'Playing sports', emoji: '🏆' },
    ],
  },
  {
    id: 'ch-1',
    category: 'challenges',
    emoji: '🌱',
    question: 'Sometimes I find it hard to...',
    type: 'multi_select',
    options: [
      { value: 'focus', label: 'Stay focused for a long time', emoji: '👀' },
      { value: 'reading', label: 'Read lots of words', emoji: '📖' },
      { value: 'math', label: 'Do math problems', emoji: '🔢' },
      { value: 'writing', label: 'Write things down', emoji: '✍️' },
      { value: 'sitting', label: 'Sit still', emoji: '🪑' },
      { value: 'none', label: 'Nothing - I got this!', emoji: '💪' },
    ],
  },
  {
    id: 'pref-1',
    category: 'preferences',
    emoji: '🎯',
    question: 'How do you feel about taking breaks?',
    type: 'emoji_scale',
    options: [
      { value: 'love', label: 'Love them!', emoji: '🥳' },
      { value: 'like', label: "They're nice", emoji: '😊' },
      { value: 'okay', label: "They're okay", emoji: '😐' },
      { value: 'rather_keep_going', label: 'Rather keep going', emoji: '🚀' },
    ],
  },
  {
    id: 'pref-2',
    category: 'preferences',
    emoji: '⏰',
    question: 'When do you feel most ready to learn?',
    type: 'choice',
    options: [
      { value: 'morning', label: 'In the morning', emoji: '🌅' },
      { value: 'afternoon', label: 'In the afternoon', emoji: '☀️' },
      { value: 'evening', label: 'In the evening', emoji: '🌙' },
      { value: 'anytime', label: 'Anytime!', emoji: '⏰' },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// GAME BREAKS - Fun mini-activities between domains
// ══════════════════════════════════════════════════════════════════════════════

interface GameBreak {
  id: string;
  type: 'breathing' | 'movement' | 'mindful' | 'celebration';
  title: string;
  emoji: string;
  instruction: string;
  duration: number; // seconds
}

const GAME_BREAKS: GameBreak[] = [
  {
    id: 'break-1',
    type: 'breathing',
    title: 'Balloon Breath! 🎈',
    emoji: '🎈',
    instruction: 'Take a deep breath in... now blow up an imaginary balloon! 🎈',
    duration: 8,
  },
  {
    id: 'break-2',
    type: 'movement',
    title: 'Shake It Out! 💃',
    emoji: '💃',
    instruction: 'Stand up and shake your arms and legs for 10 seconds! 🕺',
    duration: 10,
  },
  {
    id: 'break-3',
    type: 'mindful',
    title: 'Star Gazing ⭐',
    emoji: '⭐',
    instruction: "Close your eyes and imagine you're looking at stars in the sky... ✨",
    duration: 8,
  },
  {
    id: 'break-4',
    type: 'celebration',
    title: 'Dance Party! 🎉',
    emoji: '🎉',
    instruction: 'Do your favorite dance move! You earned it! 🕺💃',
    duration: 8,
  },
  {
    id: 'break-5',
    type: 'breathing',
    title: 'Flower Smell 🌸',
    emoji: '🌸',
    instruction: 'Breathe in like smelling a flower... breathe out like blowing a dandelion! 🌼',
    duration: 8,
  },
  {
    id: 'break-6',
    type: 'movement',
    title: 'Stretch Time! 🧘',
    emoji: '🧘',
    instruction: 'Reach your arms up high like a giraffe! 🦒 Now touch your toes!',
    duration: 10,
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT PHASES
// ══════════════════════════════════════════════════════════════════════════════

type AssessmentPhase =
  | 'loading'
  | 'preparing' // Pre-generating questions for all domains
  | 'learning_style'
  | 'transition_to_domains'
  | 'domain_intro'
  | 'domain_questions'
  | 'game_break'
  | 'completing';

/**
 * Pre-generated questions for a domain
 */
interface PreparedDomain {
  domain: string;
  name: string;
  questions: AssessmentQuestion[];
  source: 'ai' | 'stub' | 'fallback';
  generationId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function BaselineAssessmentPage() {
  const router = useRouter();

  // Assessment configuration (from parent assessment)
  const [config, setConfig] = useState<AssessmentConfig>(DEFAULT_CONFIG);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [learnerName, setLearnerName] = useState<string>('');

  // Phase management
  const [phase, setPhase] = useState<AssessmentPhase>('loading');

  // Learning style phase state
  const [lsIndex, setLsIndex] = useState(0);
  const [lsAnswers, setLsAnswers] = useState<Record<string, string | string[]>>({});
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Domain assessment phase state
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [currentQuestionInDomain, setCurrentQuestionInDomain] = useState(0);
  const [domainQuestions, setDomainQuestions] = useState<AssessmentQuestion[]>([]);
  const [domainAnswers, setDomainAnswers] = useState<
    Record<string, { answer: number | string; latencyMs: number }>
  >({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Game break state
  const [currentBreakIndex, setCurrentBreakIndex] = useState(0);
  const [breakCountdown, setBreakCountdown] = useState(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progress persistence state
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const savedProgressRef = useRef<Record<string, unknown> | null>(null);
  const prepareAssessmentRef = useRef<() => Promise<void>>();

  // Pre-generated questions (loaded during 'preparing' phase)
  const [preparedDomains, setPreparedDomains] = useState<PreparedDomain[]>([]);
  const [preparationProgress, setPreparationProgress] = useState(0);
  const [preparationStatus, setPreparationStatus] = useState<string>('Connecting to AI...');
  const [isPrepared, setIsPrepared] = useState(false);

  // ════════════════════════════════════════════════════════════════════════════
  // PROGRESS PERSISTENCE (localStorage)
  // ════════════════════════════════════════════════════════════════════════════

  const saveProgress = useCallback(() => {
    if (phase === 'loading' || phase === 'preparing' || showResumeDialog) return;
    const progress = {
      phase,
      lsIndex,
      lsAnswers,
      selectedOptions,
      currentDomainIndex,
      currentQuestionInDomain,
      domainAnswers,
      currentBreakIndex,
      preparedDomains,
      config,
      learnerName,
      isPrepared,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }, [
    phase, lsIndex, lsAnswers, selectedOptions, currentDomainIndex,
    currentQuestionInDomain, domainAnswers, currentBreakIndex,
    preparedDomains, config, learnerName, isPrepared, showResumeDialog,
  ]);

  // Auto-save whenever assessment progress changes
  useEffect(() => {
    if (phase === 'loading' || phase === 'preparing' || showResumeDialog) return;
    saveProgress();
  }, [saveProgress, phase, showResumeDialog]);

  // Save on browser close / tab close
  useEffect(() => {
    const handler = () => saveProgress();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveProgress]);

  const handleResume = useCallback(() => {
    const data = savedProgressRef.current as Record<string, any> | null;
    if (!data) return;

    setPhase(data.phase);
    setLsIndex(data.lsIndex ?? 0);
    setLsAnswers(data.lsAnswers ?? {});
    setSelectedOptions(data.selectedOptions ?? []);
    setCurrentDomainIndex(data.currentDomainIndex ?? 0);
    setCurrentQuestionInDomain(data.currentQuestionInDomain ?? 0);
    setDomainAnswers(data.domainAnswers ?? {});
    setCurrentBreakIndex(data.currentBreakIndex ?? 0);
    setPreparedDomains(data.preparedDomains ?? []);
    setConfig(data.config ?? DEFAULT_CONFIG);
    setLearnerName(data.learnerName ?? '');
    setIsPrepared(data.isPrepared ?? false);
    setIsConfigLoaded(true);
    setQuestionStartTime(Date.now());

    // Restore domain questions if resuming in domain-questions phase
    if (data.phase === 'domain_questions' && data.preparedDomains?.length > 0) {
      const enabledDoms = (data.config?.domains ?? []).filter(
        (d: DomainConfig) => d.enabled,
      );
      const currentDom = enabledDoms[data.currentDomainIndex ?? 0];
      if (currentDom) {
        const prepared = (data.preparedDomains as PreparedDomain[]).find(
          (d) => d.domain === currentDom.domain,
        );
        if (prepared) setDomainQuestions(prepared.questions);
      }
    }

    setShowResumeDialog(false);
    savedProgressRef.current = null;
  }, []);

  const handleStartOver = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setShowResumeDialog(false);
    savedProgressRef.current = null;
    // Reset all progress state
    setLsIndex(0);
    setLsAnswers({});
    setSelectedOptions([]);
    setCurrentDomainIndex(0);
    setCurrentQuestionInDomain(0);
    setDomainAnswers({});
    setCurrentBreakIndex(0);
    prepareAssessmentRef.current?.();
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // FETCH ASSESSMENT CONFIG ON LOAD
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    async function prepareAssessment() {
      setPhase('preparing');
      setPreparationProgress(10);
      setPreparationStatus('Loading your learning profile...');

      try {
        // First fetch config (for UI settings)
        const configResponse = await fetch('/api/baseline/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData.config) {
            setConfig(configData.config);
            if (configData.learnerName) {
              setLearnerName(configData.learnerName);
            }
          }
        }
        setPreparationProgress(20);
        setPreparationStatus('Understanding your learning needs...');

        // Now call prepare endpoint to pre-generate ALL questions
        setPreparationProgress(30);
        setPreparationStatus('Creating personalized questions just for you...');

        const prepareResponse = await fetch('/api/baseline/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (prepareResponse.ok) {
          const prepareData = await prepareResponse.json();

          if (prepareData.success && prepareData.domains) {
            // Update config with assessment type from profile
            if (prepareData.profile?.assessmentType) {
              setConfig((prev) => ({
                ...prev,
                assessmentType: prepareData.profile.assessmentType,
                gradeBand: prepareData.profile.gradeBand || prev.gradeBand,
              }));
            }

            // Store pre-generated questions
            setPreparedDomains(
              prepareData.domains.map(
                (d: {
                  domain: string;
                  name: string;
                  questions: AssessmentQuestion[];
                  source: string;
                  generationId?: string;
                }) => ({
                  domain: d.domain,
                  name: d.name,
                  questions: d.questions,
                  source: d.source as 'ai' | 'stub' | 'fallback',
                  generationId: d.generationId,
                })
              )
            );

            if (prepareData.profile?.firstName) {
              setLearnerName(prepareData.profile.firstName);
            }

            setIsPrepared(true);
            console.log(
              `[Assessment] Pre-generated ${prepareData.totalQuestions} questions in ${prepareData.generationTimeMs}ms`
            );
          }
        }

        setPreparationProgress(100);
        setPreparationStatus("All set! Let's begin!");

        // Brief pause to show completion
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.log('Preparation error, using defaults:', error);
        setPreparationProgress(100);
        setPreparationStatus('Ready!');
      } finally {
        setIsConfigLoaded(true);
        setPhase('learning_style');
      }
    }

    prepareAssessmentRef.current = prepareAssessment;

    // Check for saved progress in localStorage before preparing
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (Date.now() - data.savedAt < 24 * 60 * 60 * 1000) {
          savedProgressRef.current = data;
          setShowResumeDialog(true);
          return; // Wait for user to choose resume or start over
        }
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }

    prepareAssessment();
  }, []);

  // Current domain info - use config domains
  const enabledDomains = config.domains.filter((d) => d.enabled);
  const currentDomainConfig = enabledDomains[currentDomainIndex];
  const currentDomainId = (currentDomainConfig?.domain as AssessmentDomain) || 'MATH';
  const currentBreak = GAME_BREAKS[currentBreakIndex % GAME_BREAKS.length];
  const questionsPerDomain = currentDomainConfig?.questionsPerDomain || 5;

  // Calculate overall progress using config
  const totalDomainQuestions = enabledDomains.reduce((sum, d) => sum + d.questionsPerDomain, 0);
  const totalQuestions = LEARNING_STYLE_QUESTIONS.length + totalDomainQuestions;
  const completedDomainQuestions = enabledDomains
    .slice(0, currentDomainIndex)
    .reduce((sum, d) => sum + d.questionsPerDomain, 0);
  const questionsCompleted =
    phase === 'learning_style' || phase === 'loading' || phase === 'preparing'
      ? lsIndex
      : LEARNING_STYLE_QUESTIONS.length + completedDomainQuestions + currentQuestionInDomain;
  const overallProgress = (questionsCompleted / totalQuestions) * 100;

  // UI adaptations based on assessment type
  const fontSize =
    config.uiConfig.fontSizeMultiplier > 1 ? 'text-lg md:text-xl' : 'text-base md:text-lg';
  const isSimplified =
    config.assessmentType === 'MODIFIED' || config.assessmentType === 'ALTERNATE';
  const isAlternate = config.assessmentType === 'ALTERNATE';

  // ════════════════════════════════════════════════════════════════════════════
  // FETCH DOMAIN QUESTIONS - Use pre-generated if available
  // ════════════════════════════════════════════════════════════════════════════

  const fetchDomainQuestions = useCallback(
    async (domain: AssessmentDomain) => {
      setIsLoadingQuestions(true);

      try {
        // First check if we have pre-generated questions for this domain
        if (isPrepared && preparedDomains.length > 0) {
          const preparedDomain = preparedDomains.find((d) => d.domain === domain);
          if (preparedDomain && preparedDomain.questions.length > 0) {
            console.log(
              `[Assessment] Using pre-generated questions for ${domain} (${preparedDomain.source})`
            );
            setDomainQuestions(preparedDomain.questions);
            setIsLoadingQuestions(false);
            setQuestionStartTime(Date.now());
            return;
          }
        }

        // Fall back to fetching questions on-demand
        console.log(`[Assessment] Fetching questions on-demand for ${domain}`);
        const response = await fetch('/api/baseline/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain,
            count: currentDomainConfig?.questionsPerDomain || 5,
            gradeBand: config.gradeBand,
            assessmentType: config.assessmentType,
            accommodations: Object.entries(config.accommodations)
              .filter(([, v]) => v)
              .map(([k]) => k),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setDomainQuestions(data.questions);
        } else {
          // Fallback to stub questions if API fails
          setDomainQuestions(generateStubQuestions(domain));
        }
      } catch (error) {
        console.error('Failed to fetch questions:', error);
        setDomainQuestions(generateStubQuestions(domain));
      } finally {
        setIsLoadingQuestions(false);
        setQuestionStartTime(Date.now());
      }
    },
    [
      config.gradeBand,
      config.assessmentType,
      config.accommodations,
      currentDomainConfig?.questionsPerDomain,
    ]
  );

  // Generate stub questions for demo/fallback
  function generateStubQuestions(domain: AssessmentDomain): AssessmentQuestion[] {
    const stubs: Record<AssessmentDomain, AssessmentQuestion[]> = {
      MATH: [
        {
          id: 'math-1',
          domain: 'MATH',
          skillCode: 'MATH_NUMBER_SENSE',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'What is 7 + 5?',
          options: ['10', '11', '12', '13'],
          difficulty: 2,
          questionNumber: 1,
        },
        {
          id: 'math-2',
          domain: 'MATH',
          skillCode: 'MATH_OPERATIONS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'What is 15 - 8?',
          options: ['5', '6', '7', '8'],
          difficulty: 2,
          questionNumber: 2,
        },
        {
          id: 'math-3',
          domain: 'MATH',
          skillCode: 'MATH_FRACTIONS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'What is half of 10?',
          options: ['3', '4', '5', '6'],
          difficulty: 2,
          questionNumber: 3,
        },
        {
          id: 'math-4',
          domain: 'MATH',
          skillCode: 'MATH_GEOMETRY',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'How many sides does a triangle have?',
          options: ['2', '3', '4', '5'],
          difficulty: 1,
          questionNumber: 4,
        },
        {
          id: 'math-5',
          domain: 'MATH',
          skillCode: 'MATH_PROBLEM_SOLVING',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'If you have 3 apples and get 4 more, how many do you have?',
          options: ['5', '6', '7', '8'],
          difficulty: 2,
          questionNumber: 5,
        },
      ],
      ELA: [
        {
          id: 'ela-1',
          domain: 'ELA',
          skillCode: 'ELA_PHONEMIC_AWARENESS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which word rhymes with "cat"?',
          options: ['Dog', 'Hat', 'Bird', 'Fish'],
          difficulty: 1,
          questionNumber: 1,
        },
        {
          id: 'ela-2',
          domain: 'ELA',
          skillCode: 'ELA_VOCABULARY',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'What does "happy" mean?',
          options: ['Sad', 'Joyful', 'Angry', 'Tired'],
          difficulty: 1,
          questionNumber: 2,
        },
        {
          id: 'ela-3',
          domain: 'ELA',
          skillCode: 'ELA_FLUENCY',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which sentence is correct?',
          options: [
            'The dog run fast.',
            'The dog runs fast.',
            'The dog running fast.',
            'The dog runned fast.',
          ],
          difficulty: 2,
          questionNumber: 3,
        },
        {
          id: 'ela-4',
          domain: 'ELA',
          skillCode: 'ELA_COMPREHENSION',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'In the story "The Three Little Pigs", what did the wolf try to do?',
          options: [
            'Help build houses',
            'Blow the houses down',
            'Give the pigs food',
            'Teach the pigs to dance',
          ],
          difficulty: 2,
          questionNumber: 4,
        },
        {
          id: 'ela-5',
          domain: 'ELA',
          skillCode: 'ELA_WRITING',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which punctuation ends a question?',
          options: ['.', '!', '?', ','],
          difficulty: 1,
          questionNumber: 5,
        },
      ],
      SPEECH: [
        {
          id: 'speech-1',
          domain: 'SPEECH',
          skillCode: 'SPEECH_ARTICULATION',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which word starts with the same sound as "sun"?',
          options: ['Ball', 'Cat', 'Soap', 'Tree'],
          difficulty: 1,
          questionNumber: 1,
        },
        {
          id: 'speech-2',
          domain: 'SPEECH',
          skillCode: 'SPEECH_FLUENCY',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'When speaking to a group, you should...',
          options: ['Whisper quietly', 'Speak clearly', 'Talk very fast', 'Look at the floor'],
          difficulty: 2,
          questionNumber: 2,
        },
        {
          id: 'speech-3',
          domain: 'SPEECH',
          skillCode: 'SPEECH_VOICE',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'How should you speak when someone is sleeping nearby?',
          options: ['Very loudly', 'In a normal voice', 'Quietly', 'Not at all'],
          difficulty: 1,
          questionNumber: 3,
        },
        {
          id: 'speech-4',
          domain: 'SPEECH',
          skillCode: 'SPEECH_LANGUAGE',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which word means the same as "big"?',
          options: ['Small', 'Tiny', 'Large', 'Short'],
          difficulty: 1,
          questionNumber: 4,
        },
        {
          id: 'speech-5',
          domain: 'SPEECH',
          skillCode: 'SPEECH_PRAGMATICS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'When meeting someone new, you should...',
          options: ['Look away', 'Say hello', 'Stay silent', 'Run away'],
          difficulty: 1,
          questionNumber: 5,
        },
      ],
      SEL: [
        {
          id: 'sel-1',
          domain: 'SEL',
          skillCode: 'SEL_SELF_AWARENESS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'When I feel angry, I...',
          options: ['Yell at others', 'Take deep breaths', 'Break things', 'Ignore it'],
          difficulty: 2,
          questionNumber: 1,
        },
        {
          id: 'sel-2',
          domain: 'SEL',
          skillCode: 'SEL_SELF_MANAGEMENT',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'If homework is hard, I should...',
          options: ['Give up', 'Ask for help', 'Throw it away', 'Cry'],
          difficulty: 2,
          questionNumber: 2,
        },
        {
          id: 'sel-3',
          domain: 'SEL',
          skillCode: 'SEL_SOCIAL_AWARENESS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'If a friend looks sad, I could...',
          options: ['Laugh at them', 'Ask if they are okay', 'Walk away', 'Tell others'],
          difficulty: 1,
          questionNumber: 3,
        },
        {
          id: 'sel-4',
          domain: 'SEL',
          skillCode: 'SEL_RELATIONSHIPS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Good friends...',
          options: ['Share and take turns', 'Always fight', 'Ignore each other', 'Keep secrets'],
          difficulty: 1,
          questionNumber: 4,
        },
        {
          id: 'sel-5',
          domain: 'SEL',
          skillCode: 'SEL_DECISIONS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Before making a choice, I should...',
          options: [
            'Do it right away',
            'Think about what might happen',
            'Ask a stranger',
            'Flip a coin',
          ],
          difficulty: 2,
          questionNumber: 5,
        },
      ],
      SPELLING: [
        {
          id: 'spell-1',
          domain: 'SPELLING',
          skillCode: 'SPELL_PATTERNS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which spelling is correct?',
          options: ['freind', 'friend', 'frend', 'frind'],
          difficulty: 2,
          questionNumber: 1,
        },
        {
          id: 'spell-2',
          domain: 'SPELLING',
          skillCode: 'SPELL_PHONICS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'How do you spell the word for a large body of water?',
          options: ['oshun', 'ocen', 'ocean', 'oshen'],
          difficulty: 2,
          questionNumber: 2,
        },
        {
          id: 'spell-3',
          domain: 'SPELLING',
          skillCode: 'SPELL_RULES',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which is the correct plural of "cat"?',
          options: ['cates', 'cats', 'caties', "cat's"],
          difficulty: 1,
          questionNumber: 3,
        },
        {
          id: 'spell-4',
          domain: 'SPELLING',
          skillCode: 'SPELL_SIGHT_WORDS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which word is spelled correctly?',
          options: ['becuz', 'becuase', 'because', 'becouse'],
          difficulty: 2,
          questionNumber: 4,
        },
        {
          id: 'spell-5',
          domain: 'SPELLING',
          skillCode: 'SPELL_COMPOUND',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'How do you spell "sun" + "flower"?',
          options: ['sunflower', 'sun flower', 'sunflawer', 'son flower'],
          difficulty: 2,
          questionNumber: 5,
        },
      ],
      CREATIVE_WRITING: [
        {
          id: 'cw-1',
          domain: 'CREATIVE_WRITING',
          skillCode: 'CW_STORY_ELEMENTS',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Every story needs a...',
          options: ['Beginning, middle, and end', 'Picture', 'Long title', 'Rhyme'],
          difficulty: 1,
          questionNumber: 1,
        },
        {
          id: 'cw-2',
          domain: 'CREATIVE_WRITING',
          skillCode: 'CW_CHARACTER',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'A character in a story is...',
          options: ['The setting', 'A person or animal', 'The ending', 'The title'],
          difficulty: 1,
          questionNumber: 2,
        },
        {
          id: 'cw-3',
          domain: 'CREATIVE_WRITING',
          skillCode: 'CW_SETTING',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'The setting tells us...',
          options: ['Who is in the story', 'Where and when', 'What happens last', 'The moral'],
          difficulty: 1,
          questionNumber: 3,
        },
        {
          id: 'cw-4',
          domain: 'CREATIVE_WRITING',
          skillCode: 'CW_DESCRIPTIVE',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Which sentence is more descriptive?',
          options: ['The dog ran.', 'The fluffy brown dog ran quickly.', 'Dog.', 'Running.'],
          difficulty: 2,
          questionNumber: 4,
        },
        {
          id: 'cw-5',
          domain: 'CREATIVE_WRITING',
          skillCode: 'CW_IMAGINATION',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'In creative writing, you can...',
          options: [
            'Only write facts',
            'Make up stories',
            'Copy from books',
            'Only use real people',
          ],
          difficulty: 1,
          questionNumber: 5,
        },
      ],
      LIFE_SKILLS: [
        {
          id: 'life-1',
          domain: 'LIFE_SKILLS',
          skillCode: 'LIFE_TIME',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'What time do we usually eat lunch?',
          options: ['Midnight', 'Around noon', '6am', '10pm'],
          difficulty: 1,
          questionNumber: 1,
        },
        {
          id: 'life-2',
          domain: 'LIFE_SKILLS',
          skillCode: 'LIFE_MONEY',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'If something costs $3 and you have $5, how much change do you get?',
          options: ['$1', '$2', '$3', '$8'],
          difficulty: 2,
          questionNumber: 2,
        },
        {
          id: 'life-3',
          domain: 'LIFE_SKILLS',
          skillCode: 'LIFE_SAFETY',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Before crossing the street, you should...',
          options: ['Run quickly', 'Look both ways', 'Close your eyes', 'Skip'],
          difficulty: 1,
          questionNumber: 3,
        },
        {
          id: 'life-4',
          domain: 'LIFE_SKILLS',
          skillCode: 'LIFE_HYGIENE',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'When should you wash your hands?',
          options: ['Never', 'Before eating', 'Only on Mondays', 'Once a year'],
          difficulty: 1,
          questionNumber: 4,
        },
        {
          id: 'life-5',
          domain: 'LIFE_SKILLS',
          skillCode: 'LIFE_ORGANIZATION',
          questionType: 'MULTIPLE_CHOICE',
          questionText: 'Keeping your things organized helps you...',
          options: ['Lose things', 'Find things easily', 'Make a mess', 'Forget things'],
          difficulty: 1,
          questionNumber: 5,
        },
      ],
    };
    return stubs[domain] || [];
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LEARNING STYLE PHASE HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const currentLsQuestion = LEARNING_STYLE_QUESTIONS[lsIndex];
  const isLastLsQuestion = lsIndex === LEARNING_STYLE_QUESTIONS.length - 1;

  useEffect(() => {
    if (phase === 'learning_style' && currentLsQuestion?.type === 'multi_select') {
      const existing = lsAnswers[currentLsQuestion.id];
      setSelectedOptions(Array.isArray(existing) ? existing : []);
    } else {
      setSelectedOptions([]);
    }
  }, [lsIndex, currentLsQuestion?.id, currentLsQuestion?.type, lsAnswers, phase]);

  const handleLsSingleSelect = (value: string) => {
    setLsAnswers((prev) => ({ ...prev, [currentLsQuestion.id]: value }));

    setTimeout(() => {
      if (isLastLsQuestion) {
        // Move to domain assessment phase
        setPhase('transition_to_domains');
      } else {
        setLsIndex((prev) => prev + 1);
      }
    }, 300);
  };

  const handleLsMultiSelect = (value: string) => {
    setSelectedOptions((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      } else {
        if (value === 'none') return ['none'];
        return [...prev.filter((v) => v !== 'none'), value];
      }
    });
  };

  const handleLsMultiSelectContinue = () => {
    if (selectedOptions.length === 0) return;

    setLsAnswers((prev) => ({ ...prev, [currentLsQuestion.id]: selectedOptions }));

    if (isLastLsQuestion) {
      setPhase('transition_to_domains');
    } else {
      setLsIndex((prev) => prev + 1);
    }
  };

  const handleLsBack = () => {
    if (lsIndex > 0) {
      setLsIndex((prev) => prev - 1);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // DOMAIN ASSESSMENT HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const startDomainAssessment = useCallback(() => {
    setCurrentDomainIndex(0);
    setCurrentQuestionInDomain(0);
    setPhase('domain_intro');
  }, []);

  const startCurrentDomain = useCallback(() => {
    if (currentDomainId) {
      fetchDomainQuestions(currentDomainId);
      setPhase('domain_questions');
    }
  }, [currentDomainId, fetchDomainQuestions]);

  const handleDomainAnswer = (optionIndex: number) => {
    const currentQuestion = domainQuestions[currentQuestionInDomain];
    if (!currentQuestion) return;

    const latencyMs = Date.now() - questionStartTime;

    setDomainAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: { answer: optionIndex, latencyMs },
    }));

    setTimeout(() => {
      if (currentQuestionInDomain < questionsPerDomain - 1) {
        // More questions in this domain
        setCurrentQuestionInDomain((prev) => prev + 1);
        setQuestionStartTime(Date.now());
      } else {
        // Domain complete - show game break or complete
        if (currentDomainIndex < enabledDomains.length - 1) {
          setPhase('game_break');
        } else {
          // All domains complete!
          setPhase('completing');
          void handleFinalSubmit();
        }
      }
    }, 300);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // GAME BREAK HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const moveToNextDomain = useCallback(() => {
    setCurrentBreakIndex((prev) => prev + 1);
    setCurrentDomainIndex((prev) => prev + 1);
    setCurrentQuestionInDomain(0);
    setPhase('domain_intro');
  }, []);

  useEffect(() => {
    if (phase === 'game_break') {
      setBreakCountdown(currentBreak.duration);

      breakTimerRef.current = setInterval(() => {
        setBreakCountdown((prev) => {
          if (prev <= 1) {
            if (breakTimerRef.current) {
              clearInterval(breakTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (breakTimerRef.current) {
          clearInterval(breakTimerRef.current);
        }
      };
    }
  }, [phase, currentBreak.duration]);

  const skipBreak = () => {
    if (breakTimerRef.current) {
      clearInterval(breakTimerRef.current);
    }
    moveToNextDomain();
  };

  // Auto-advance when break countdown reaches 0
  useEffect(() => {
    if (phase === 'game_break' && breakCountdown === 0) {
      const timer = setTimeout(moveToNextDomain, 500);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [phase, breakCountdown, moveToNextDomain]);

  // ════════════════════════════════════════════════════════════════════════════
  // FINAL SUBMISSION
  // ════════════════════════════════════════════════════════════════════════════

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Submit both learning style answers and domain answers
      const response = await fetch('/api/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningStyleAnswers: lsAnswers,
          domainAnswers,
          completedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save baseline');
      }

      // Clear saved progress on successful submission
      try { localStorage.removeItem(STORAGE_KEY); } catch {}

      // Navigate to brain cloning page
      router.push('/baseline/brain-clone');
    } catch (error) {
      console.error('Failed to submit baseline:', error);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      // Still proceed to brain cloning
      router.push('/baseline/brain-clone');
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER FUNCTIONS
  // ════════════════════════════════════════════════════════════════════════════

  const renderLearningStylePhase = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">{currentLsQuestion.emoji}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentLsQuestion.question}
            </h2>
            {currentLsQuestion.type === 'multi_select' && (
              <p className="text-sm text-gray-500 mt-2">
                Pick as many as you want! 👆
              </p>
            )}
          </div>

          <div
            className={`grid gap-3 ${currentLsQuestion.type === 'multi_select' ? 'grid-cols-2' : ''}`}
          >
            {currentLsQuestion.options.map((option) => {
              const isSelected =
                currentLsQuestion.type === 'multi_select'
                  ? selectedOptions.includes(option.value)
                  : lsAnswers[currentLsQuestion.id] === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (currentLsQuestion.type === 'multi_select') {
                      handleLsMultiSelect(option.value);
                    } else {
                      handleLsSingleSelect(option.value);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3
                    ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                >
                  {option.emoji && <span className="text-2xl flex-shrink-0">{option.emoji}</span>}
                  <span
                    className={`font-medium ${isSelected ? 'text-indigo-600' : 'text-gray-900'}`}
                  >
                    {option.label}
                  </span>
                  {isSelected && currentLsQuestion.type === 'multi_select' && (
                    <span className="ml-auto text-indigo-600">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {currentLsQuestion.type === 'multi_select' && (
            <div className="mt-6">
              <button
                onClick={handleLsMultiSelectContinue}
                disabled={selectedOptions.length === 0}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 
                  hover:opacity-90 disabled:opacity-50 text-white text-lg font-bold rounded-xl transition-all disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={handleLsBack}
            disabled={lsIndex === 0}
            className="text-indigo-600 hover:text-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            ← Back
          </button>
          <div className="flex gap-1">
            {LEARNING_STYLE_QUESTIONS.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === lsIndex
                    ? 'bg-indigo-600'
                    : idx < lsIndex
                      ? 'bg-indigo-400'
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="w-12" />
        </div>
      </div>
    </div>
  );

  const renderTransitionToDomains = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <span className="text-5xl">🎉</span>
          </div>
          <h2
            className={`font-bold text-gray-900 mb-4 ${isAlternate ? 'text-2xl' : 'text-3xl'}`}
          >
            {isSimplified ? 'You did great!' : 'Great job so far!'}
          </h2>
          <p
            className={`text-gray-600 mb-6 ${isAlternate ? 'text-xl' : 'text-lg'}`}
          >
            {isAlternate
              ? "Let's play some games!"
              : isSimplified
                ? "Now let's play some fun games!"
                : "Now let's explore what you know! We'll play some quick games in different subjects."}
          </p>

          {/* Caregiver notice for ALTERNATE */}
          {isAlternate && (
            <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-center mb-4">
              👋 Helper: Please guide the learner through these activities
            </div>
          )}

          {/* Show domain icons based on enabled domains from config */}
          <div
            className={`grid gap-3 mb-8 ${
              enabledDomains.length <= 4 ? 'grid-cols-' + enabledDomains.length : 'grid-cols-4'
            }`}
          >
            {enabledDomains.slice(0, 4).map((domain) => (
              <div key={domain.domain} className="text-center">
                <div
                  className={`mx-auto bg-indigo-50 rounded-xl flex items-center justify-center mb-2 ${isAlternate ? 'w-16 h-16' : 'w-14 h-14'}`}
                >
                  <span className={isAlternate ? 'text-3xl' : 'text-2xl'}>{domain.icon}</span>
                </div>
                <span
                  className={`text-gray-500 ${isAlternate ? 'text-sm' : 'text-xs'}`}
                >
                  {domain.name}
                </span>
              </div>
            ))}
          </div>
          {enabledDomains.length > 4 && (
            <div
              className={`grid gap-3 mb-8 max-w-xs mx-auto grid-cols-${Math.min(enabledDomains.length - 4, 3)}`}
            >
              {enabledDomains.slice(4).map((domain) => (
                <div key={domain.domain} className="text-center">
                  <div
                    className={`mx-auto bg-indigo-50 rounded-xl flex items-center justify-center mb-2 ${isAlternate ? 'w-16 h-16' : 'w-14 h-14'}`}
                  >
                    <span className={isAlternate ? 'text-3xl' : 'text-2xl'}>{domain.icon}</span>
                  </div>
                  <span
                    className={`text-gray-500 ${isAlternate ? 'text-sm' : 'text-xs'}`}
                  >
                    {domain.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p
            className={`text-gray-500 mb-6 ${isAlternate ? 'text-base' : 'text-sm'}`}
          >
            {isSimplified
              ? 'Just try your best! 💪'
              : "Don't worry - there are no wrong answers! Just do your best. 💪"}
          </p>

          <button
            onClick={startDomainAssessment}
            className={`w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 
              hover:opacity-90 text-white font-bold rounded-xl transition-all ${isAlternate ? 'text-2xl py-5' : 'text-xl'}`}
          >
            {isSimplified ? "Let's Play! 🎮" : "Let's Go! 🚀"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDomainIntro = () => {
    // Use config for domain info
    const domainInfo = {
      name: currentDomainConfig?.name || 'Questions',
      emoji: currentDomainConfig?.icon || '📝',
      description: isSimplified
        ? `Let's answer some ${currentDomainConfig?.name?.toLowerCase() || 'fun'} questions!`
        : `Let's see what you know about ${currentDomainConfig?.name?.toLowerCase() || 'this topic'}!`,
      color: 'from-purple-400 to-purple-600',
    };

    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-xl w-full text-center">
          <div
            className={`bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100 ${isAlternate ? 'text-xl' : ''}`}
          >
            <div
              className={`w-28 h-28 mx-auto bg-gradient-to-br ${domainInfo.color} rounded-full flex items-center justify-center mb-6 shadow-lg`}
            >
              <span className="text-6xl">{domainInfo.emoji}</span>
            </div>
            <h2
              className={`font-bold text-gray-900 mb-3 ${isAlternate ? 'text-4xl' : 'text-3xl'}`}
            >
              {domainInfo.name}
            </h2>
            <p
              className={`text-gray-600 mb-2 ${isAlternate ? 'text-xl' : 'text-lg'}`}
            >
              {domainInfo.description}
            </p>
            <div className="inline-block bg-indigo-100 text-indigo-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
              {questionsPerDomain} {isSimplified ? 'fun' : 'quick'} questions
            </div>

            {isAlternate && (
              <p className="text-lg text-indigo-500 mb-4">
                👋 Your helper can read these to you!
              </p>
            )}

            <button
              onClick={startCurrentDomain}
              className={`w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 
              hover:opacity-90 text-white font-bold rounded-xl transition-all ${isAlternate ? 'text-2xl' : 'text-xl'}`}
            >
              {isSimplified ? "Let's Go! 🎉" : 'Start! ✨'}
            </button>
          </div>

          {/* Domain progress indicator */}
          <div className="mt-6 flex justify-center gap-2 flex-wrap">
            {enabledDomains.map((domain, idx) => (
              <div
                key={domain.domain}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  idx < currentDomainIndex
                    ? 'bg-indigo-400 text-white'
                    : idx === currentDomainIndex
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                      : 'bg-white text-gray-400 border-2 border-gray-200'
                }`}
              >
                {idx < currentDomainIndex ? '✓' : <span className="text-lg">{domain.icon}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDomainQuestions = () => {
    if (isLoadingQuestions) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <span className="text-4xl">{currentDomainConfig?.icon || '📝'}</span>
            </div>
            <p className={`text-gray-600 ${isAlternate ? 'text-xl' : 'text-lg'}`}>
              {isSimplified ? 'Getting ready... 🎮' : 'Getting your questions ready...'}
            </p>
          </div>
        </div>
      );
    }

    const currentQ = domainQuestions[currentQuestionInDomain];
    if (!currentQ) return null;

    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className={`max-w-xl w-full ${isAlternate ? 'max-w-2xl' : ''}`}>
          <div
            className={`bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100 
            ${config.uiConfig.highContrast ? 'border-4' : ''}`}
          >
            {/* Domain badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className={isAlternate ? 'text-3xl' : 'text-2xl'}>
                {currentDomainConfig?.icon || '📝'}
              </span>
              <span
                className={`font-medium text-gray-500 ${isAlternate ? 'text-lg' : 'text-sm'}`}
              >
                {currentDomainConfig?.name || 'Questions'} • Question {currentQuestionInDomain + 1}{' '}
                of {questionsPerDomain}
              </span>
            </div>

            {/* Caregiver helper notice for ALTERNATE */}
            {isAlternate && (
              <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-center mb-4">
                👋 Helper: Please read aloud to the learner
              </div>
            )}

            {/* Question */}
            <h2
              className={`font-bold text-gray-900 text-center mb-6 
              ${isAlternate ? 'text-2xl leading-relaxed' : isSimplified ? 'text-xl' : 'text-xl'}`}
              style={{ fontSize: `${1.25 * config.uiConfig.fontSizeMultiplier}rem` }}
            >
              {currentQ.questionText}
            </h2>

            {/* Options - adapted for assessment type */}
            <div className={`grid gap-3 ${isAlternate ? 'gap-4' : ''}`}>
              {currentQ.options?.slice(0, config.uiConfig.optionCount).map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handleDomainAnswer(idx);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left font-medium text-gray-900
                    ${
                      isAlternate
                        ? 'border-gray-300 hover:border-indigo-600 hover:bg-indigo-100 p-6 text-xl'
                        : 'border-gray-200 hover:border-indigo-600 hover:bg-indigo-50'
                    }
                    ${config.uiConfig.highContrast ? 'border-3' : ''}`}
                  style={{ fontSize: `${1 * config.uiConfig.fontSizeMultiplier}rem` }}
                >
                  <span
                    className={`inline-flex items-center justify-center bg-indigo-100 
                    text-indigo-600 rounded-full mr-3 font-bold
                    ${isAlternate ? 'w-10 h-10 text-lg' : 'w-8 h-8 text-sm'}`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {/* Skip button for accommodated assessments */}
            {config.uiConfig.allowSkip && (
              <button
                onClick={() => {
                  handleDomainAnswer(-1);
                }} // -1 indicates skipped
                className="w-full mt-4 py-2 text-gray-500 hover:text-indigo-600 text-sm"
              >
                Skip this question →
              </button>
            )}
          </div>

          {/* Question progress dots */}
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: questionsPerDomain }).map((_, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full transition-colors ${
                  idx === currentQuestionInDomain
                    ? 'bg-indigo-600'
                    : idx < currentQuestionInDomain
                      ? 'bg-indigo-400'
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGameBreak = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-indigo-100">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg animate-bounce">
            <span className="text-7xl">{currentBreak.emoji}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {currentBreak.title}
          </h2>
          <p className="text-xl text-gray-600 mb-6">{currentBreak.instruction}</p>

          {/* Countdown circle */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#4F46E5"
                strokeWidth="8"
                fill="none"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 * (1 - breakCountdown / currentBreak.duration)}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-indigo-600">
              {breakCountdown}
            </span>
          </div>

          <button
            onClick={skipBreak}
            className="text-gray-500 hover:text-indigo-600 text-sm"
          >
            Skip break →
          </button>
        </div>

        {/* Celebration message */}
        <div className="mt-6 bg-indigo-50 rounded-2xl p-4">
          <p className={`text-indigo-700 font-medium ${isAlternate ? 'text-lg' : ''}`}>
            🎉 {isSimplified ? 'Yay!' : 'You completed'} {currentDomainConfig?.name}!{' '}
            {enabledDomains.length - currentDomainIndex - 1} more to go!
          </p>
        </div>
      </div>
    </div>
  );

  const renderCompleting = () => (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-lg">
          <span className="text-6xl">🧠</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Amazing work! 🌟</h2>
        <p className="text-lg text-gray-600">
          Preparing your personalized learning brain...
        </p>
        <div className="mt-4 flex justify-center gap-1">
          <div
            className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );

  const renderResumeDialog = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 bg-white rounded-3xl shadow-2xl p-8 border-2 border-indigo-100">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">📝</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-gray-600">
            You have a saved assessment in progress. Would you like to continue
            where you left off?
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleResume}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:opacity-90 text-white text-lg font-bold rounded-xl transition-all"
          >
            Continue where I left off →
          </button>
          <button
            onClick={handleStartOver}
            className="w-full py-3 px-6 border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700 font-medium rounded-xl transition-all"
          >
            Start over
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Saved progress expires after 24 hours
        </p>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-indigo-50 flex flex-col">
      {/* Header with progress */}
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Image src="/images/aivo-logo-horizontal-purple.svg" alt="AIVO" width={100} height={32} />
          <div className="flex-1">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>
                {phase === 'loading' && 'Loading...'}
                {phase === 'preparing' && 'Preparing your questions...'}
                {phase === 'learning_style' && 'Getting to know you...'}
                {phase === 'transition_to_domains' && 'Ready for the fun part!'}
                {phase === 'domain_intro' &&
                  `Starting ${currentDomainConfig?.name || 'Questions'}...`}
                {phase === 'domain_questions' &&
                  `${currentDomainConfig?.name || 'Questions'} - Q${currentQuestionInDomain + 1}/${questionsPerDomain}`}
                {phase === 'game_break' && 'Break time! 🎉'}
                {phase === 'completing' && 'Almost done!'}
              </span>
              <span>{Math.round(overallProgress)}% complete</span>
            </div>
            <div className="h-3 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Phase content */}
      {phase === 'loading' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-100 to-indigo-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <span className="text-5xl">🌟</span>
            </div>
            <p className="text-xl text-gray-900 font-medium mb-2">
              {learnerName ? `Hi ${learnerName}!` : 'Welcome!'}
            </p>
            <p className="text-gray-600">
              Setting up your personalized assessment...
            </p>
          </div>
        </div>
      )}

      {/* Preparing phase - Pre-generating questions */}
      {phase === 'preparing' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-100 via-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mb-8 relative">
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full border-4 border-indigo-300 animate-ping opacity-30" />
              <div className="absolute inset-2 rounded-full border-2 border-indigo-300 animate-pulse" />
              <span className="text-6xl animate-bounce">🧠</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {learnerName ? `Getting ready for you, ${learnerName}!` : 'Preparing Your Assessment'}
            </h2>

            <p className="text-lg text-gray-600 mb-6">{preparationStatus}</p>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 via-indigo-600 to-indigo-500 transition-all duration-700 ease-out rounded-full"
                style={{ width: `${preparationProgress}%` }}
              />
            </div>

            <p className="text-sm text-gray-500">
              {preparationProgress < 30 && '🔍 Analyzing your learning profile...'}
              {preparationProgress >= 30 &&
                preparationProgress < 70 &&
                '✨ Creating personalized questions...'}
              {preparationProgress >= 70 && preparationProgress < 100 && '🎯 Almost ready...'}
              {preparationProgress >= 100 && "🚀 Let's go!"}
            </p>

            {/* Fun facts while waiting */}
            <div className="mt-8 p-4 bg-white/50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600 italic">
                💡 Did you know? Our AI creates unique questions just for you based on your grade
                level and learning needs!
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === 'learning_style' && renderLearningStylePhase()}
      {phase === 'transition_to_domains' && renderTransitionToDomains()}
      {phase === 'domain_intro' && renderDomainIntro()}
      {phase === 'domain_questions' && renderDomainQuestions()}
      {phase === 'game_break' && renderGameBreak()}
      {phase === 'completing' && renderCompleting()}

      {showResumeDialog && renderResumeDialog()}
    </div>
  );
}
