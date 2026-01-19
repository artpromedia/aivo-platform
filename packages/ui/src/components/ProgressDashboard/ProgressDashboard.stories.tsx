import type { Meta, StoryObj } from '@storybook/react';
import { ProgressDashboard } from './ProgressDashboard';
import type { DailyGoal, LearningLesson, Achievement } from '../../types';

const sampleGoals: DailyGoal[] = [
  { id: 'g1', title: 'Complete 2 lessons', current: 1, target: 2, emoji: '📖' },
  { id: 'g2', title: 'Earn 100 XP', current: 75, target: 100, emoji: '⭐' },
  { id: 'g3', title: 'Practice math', current: 10, target: 15, emoji: '🧮' },
];

const sampleLessons: LearningLesson[] = [
  {
    id: 'lesson-1',
    courseId: 'math-101',
    title: 'Multiplying Fractions',
    courseName: 'Math 5',
    progress: 65,
    thumbnail: '🧮',
    estimatedTime: '15 min',
  },
  {
    id: 'lesson-2',
    courseId: 'science-101',
    title: 'The Water Cycle',
    courseName: 'Science 5',
    progress: 30,
    thumbnail: '🌊',
    estimatedTime: '20 min',
  },
];

const sampleAchievements: Achievement[] = [
  { id: 'a1', title: 'First Steps', emoji: '👣', earned: true },
  { id: 'a2', title: 'Math Whiz', emoji: '🧠', earned: true },
  { id: 'a3', title: 'Science Star', emoji: '🌟', earned: false },
  { id: 'a4', title: 'Reading Pro', emoji: '📚', earned: false },
];

const meta: Meta<typeof ProgressDashboard> = {
  title: 'Components/ProgressDashboard',
  component: ProgressDashboard,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ProgressDashboard>;

export const Default: Story = {
  args: {
    firstName: 'Alex',
    dailyGoals: sampleGoals,
    continueLearning: sampleLessons,
    achievements: sampleAchievements,
    streak: 5,
    onLessonClick: (lessonId, courseId) => console.log('Lesson clicked:', lessonId, courseId),
    onViewAllCourses: () => console.log('View all courses'),
    onViewAchievements: () => console.log('View achievements'),
  },
  decorators: [
    (Story) => (
      <div className="p-6 bg-slate-50 min-h-screen">
        <Story />
      </div>
    ),
  ],
};

export const NewUser: Story = {
  args: {
    ...Default.args,
    firstName: 'New Learner',
    streak: 1,
    dailyGoals: sampleGoals.map((g) => ({ ...g, current: 0 })),
    achievements: sampleAchievements.map((a) => ({ ...a, earned: false })),
  },
  decorators: Default.decorators,
};

export const HighStreak: Story = {
  args: {
    ...Default.args,
    streak: 30,
    achievements: sampleAchievements.map((a) => ({ ...a, earned: true })),
  },
  decorators: Default.decorators,
};
