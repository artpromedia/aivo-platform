import type { Meta, StoryObj } from '@storybook/react';
import { AssessmentFlow } from './AssessmentFlow';
import { AssessmentCard } from './AssessmentCard';
import { QuestionRenderer } from './QuestionRenderer';
import { GameBreak } from './GameBreak';
import { ProgressIndicator } from './ProgressIndicator';
import type { DomainInfo, AssessmentQuestion } from '../../types';

const sampleDomains: DomainInfo[] = [
  { id: 'MATH', name: 'Math', emoji: '🧮', description: 'Number sense and operations', color: 'from-blue-500 to-cyan-500' },
  { id: 'ELA', name: 'Reading', emoji: '📚', description: 'Reading comprehension', color: 'from-purple-500 to-pink-500' },
  { id: 'SCIENCE', name: 'Science', emoji: '🔬', description: 'Scientific concepts', color: 'from-green-500 to-emerald-500' },
];

const sampleQuestion: AssessmentQuestion = {
  id: 'math-1',
  domain: 'MATH',
  skillCode: 'MATH_NUMBER_SENSE',
  questionType: 'MULTIPLE_CHOICE',
  questionText: 'What is 7 + 5?',
  options: ['10', '11', '12', '13'],
  difficulty: 2,
  questionNumber: 1,
};

// AssessmentCard Stories
export const CardIntro: StoryObj<typeof AssessmentCard> = {
  render: () => (
    <AssessmentCard
      domain={sampleDomains[0]}
      variant="intro"
      onClick={() => console.log('Start domain')}
    />
  ),
};

export const CardProgress: StoryObj<typeof AssessmentCard> = {
  render: () => (
    <AssessmentCard
      domain={sampleDomains[0]}
      variant="progress"
      answeredCount={3}
      totalQuestions={5}
    />
  ),
};

export const CardComplete: StoryObj<typeof AssessmentCard> = {
  render: () => (
    <AssessmentCard
      domain={sampleDomains[0]}
      variant="complete"
    />
  ),
};

// QuestionRenderer Stories
export const Question: StoryObj<typeof QuestionRenderer> = {
  render: () => (
    <QuestionRenderer
      question={sampleQuestion}
      domain={sampleDomains[0]}
      questionNumber={1}
      totalQuestions={5}
      onAnswer={(idx) => console.log('Selected:', idx)}
    />
  ),
};

// GameBreak Stories
export const Break: StoryObj<typeof GameBreak> = {
  render: () => (
    <GameBreak
      activity={{
        emoji: '🎈',
        title: 'Balloon Breath!',
        instruction: 'Take a deep breath in... now blow up an imaginary balloon!',
        duration: 8,
      }}
      countdown={5}
      message="🎉 You completed Math! 2 more to go!"
      onSkip={() => console.log('Skipped')}
    />
  ),
};

// ProgressIndicator Stories
export const Progress: StoryObj<typeof ProgressIndicator> = {
  render: () => (
    <div className="w-64 space-y-4">
      <ProgressIndicator progress={25} label="Getting to know you..." />
      <ProgressIndicator progress={50} size="sm" />
      <ProgressIndicator progress={75} size="lg" showPercentage={false} />
    </div>
  ),
};

// AssessmentFlow Stories
const meta: Meta<typeof AssessmentFlow> = {
  title: 'Components/Assessment',
  component: AssessmentFlow,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof AssessmentFlow>;

export const DomainIntro: Story = {
  args: {
    phase: 'domain_intro',
    domains: sampleDomains,
    currentDomainIndex: 0,
    currentQuestionIndex: 0,
    progress: 25,
    onAnswer: (qId, ans) => console.log('Answer:', qId, ans),
    onPhaseChange: (phase) => console.log('Phase:', phase),
    onStartDomain: () => console.log('Start domain'),
    onSkipBreak: () => console.log('Skip break'),
  },
};

export const DomainQuestions: Story = {
  args: {
    ...DomainIntro.args,
    phase: 'domain_questions',
    questions: [sampleQuestion],
  },
};

export const DomainGameBreak: Story = {
  args: {
    ...DomainIntro.args,
    phase: 'game_break',
  },
};

export const Completing: Story = {
  args: {
    ...DomainIntro.args,
    phase: 'completing',
    progress: 100,
  },
};

export const Loading: Story = {
  args: {
    ...DomainIntro.args,
    phase: 'domain_questions',
    isLoading: true,
  },
};
