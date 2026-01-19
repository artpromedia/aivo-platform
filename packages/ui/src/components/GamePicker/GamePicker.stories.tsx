import type { Meta, StoryObj } from '@storybook/react';
import { GamePicker } from './GamePicker';

const meta: Meta<typeof GamePicker> = {
  title: 'Components/GamePicker',
  component: GamePicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    focusState: {
      control: 'select',
      options: ['focused', 'wandering', 'distracted'],
      description: 'Current focus state of the learner',
    },
    theme: {
      control: 'select',
      options: ['K5', 'MS', 'HS'],
      description: 'Theme variant based on grade band',
    },
  },
};

export default meta;
type Story = StoryObj<typeof GamePicker>;

export const Default: Story = {
  args: {
    focusState: 'wandering',
    theme: 'K5',
    previousGames: [],
    onGameSelected: (gameId) => console.log('Selected:', gameId),
    onCancel: () => console.log('Cancelled'),
  },
};

export const Focused: Story = {
  args: {
    ...Default.args,
    focusState: 'focused',
  },
};

export const Distracted: Story = {
  args: {
    ...Default.args,
    focusState: 'distracted',
  },
};

export const WithPreviousGames: Story = {
  args: {
    ...Default.args,
    focusState: 'focused',
    previousGames: ['math-challenge', 'word-puzzle'],
  },
};
