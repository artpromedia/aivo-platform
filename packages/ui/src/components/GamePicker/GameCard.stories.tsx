import type { Meta, StoryObj } from '@storybook/react';
import { GameCard } from './GameCard';
import type { GameType } from '../../types';

const sampleGame: GameType = {
  id: 'math-challenge',
  title: 'Math Challenge',
  description: 'Test your math skills with timed problems',
  emoji: '🧮',
  color: 'from-blue-500 to-cyan-500',
  difficulty: 'Medium',
  plays: 1234,
  highScore: 850,
  category: 'Math',
};

const meta: Meta<typeof GameCard> = {
  title: 'Components/GamePicker/GameCard',
  component: GameCard,
  tags: ['autodocs'],
  argTypes: {
    game: {
      description: 'Game data object',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the card is selected',
    },
    showStats: {
      control: 'boolean',
      description: 'Whether to show plays and high score stats',
    },
  },
};

export default meta;
type Story = StoryObj<typeof GameCard>;

export const Default: Story = {
  args: {
    game: sampleGame,
    onClick: (gameId) => console.log('Clicked:', gameId),
    showStats: true,
  },
};

export const Selected: Story = {
  args: {
    ...Default.args,
    selected: true,
  },
};

export const NoStats: Story = {
  args: {
    ...Default.args,
    showStats: false,
  },
};

export const EasyDifficulty: Story = {
  args: {
    ...Default.args,
    game: { ...sampleGame, difficulty: 'Easy' },
  },
};

export const HardDifficulty: Story = {
  args: {
    ...Default.args,
    game: { ...sampleGame, difficulty: 'Hard' },
  },
};
