import type { Meta, StoryObj } from '@storybook/react';
import { FocusTimer } from './FocusTimer';
import type { FocusPreferences } from '../../types';

const defaultPreferences: FocusPreferences = {
  defaultMode: 'pomodoro',
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  customWorkMinutes: 45,
  customBreakMinutes: 10,
  soundEnabled: false,
  notificationsEnabled: false,
};

const meta: Meta<typeof FocusTimer> = {
  title: 'Components/FocusTimer',
  component: FocusTimer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof FocusTimer>;

export const Idle: Story = {
  args: {
    learnerId: 'learner-123',
    preferences: defaultPreferences,
    onSessionUpdate: (session) => console.log('Session update:', session),
  },
};

export const CustomMode: Story = {
  args: {
    ...Idle.args,
    preferences: {
      ...defaultPreferences,
      defaultMode: 'custom',
    },
  },
};

export const DeepWorkMode: Story = {
  args: {
    ...Idle.args,
    preferences: {
      ...defaultPreferences,
      defaultMode: 'deep-work',
    },
  },
};

export const WithSoundEnabled: Story = {
  args: {
    ...Idle.args,
    preferences: {
      ...defaultPreferences,
      soundEnabled: true,
      notificationsEnabled: true,
    },
  },
};
