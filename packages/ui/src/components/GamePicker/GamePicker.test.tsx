import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GamePicker } from './GamePicker';
import type { GameType } from '../../types';

const mockGames: GameType[] = [
  {
    id: 'breathing-game',
    title: 'Calm Breathing',
    description: 'Relax with guided breathing exercises',
    emoji: '🎈',
    color: 'from-blue-400 to-cyan-400',
    difficulty: 'Easy',
    plays: 5000,
    highScore: 100,
    category: 'Focus',
  },
  {
    id: 'math-challenge',
    title: 'Math Challenge',
    description: 'Test your math skills',
    emoji: '🧮',
    color: 'from-blue-500 to-cyan-500',
    difficulty: 'Medium',
    plays: 1234,
    highScore: 850,
    category: 'Math',
  },
];

describe('GamePicker', () => {
  it('renders game suggestions based on focus state', () => {
    const onGameSelected = vi.fn();
    const onCancel = vi.fn();

    render(
      <GamePicker
        focusState="distracted"
        theme="K5"
        previousGames={[]}
        games={mockGames}
        onGameSelected={onGameSelected}
        onCancel={onCancel}
      />
    );

    // Should show calming message for distracted state
    expect(screen.getByText(/let's take a breather/i)).toBeInTheDocument();
    // Should show breathing game for distracted state
    expect(screen.getByText('Calm Breathing')).toBeInTheDocument();
  });

  it('shows all games when focused', () => {
    const onGameSelected = vi.fn();
    const onCancel = vi.fn();

    render(
      <GamePicker
        focusState="focused"
        theme="K5"
        games={mockGames}
        onGameSelected={onGameSelected}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText("You're doing great!")).toBeInTheDocument();
    expect(screen.getByText('Calm Breathing')).toBeInTheDocument();
    expect(screen.getByText('Math Challenge')).toBeInTheDocument();
  });

  it('calls onGameSelected when game is clicked', () => {
    const onGameSelected = vi.fn();
    const onCancel = vi.fn();

    render(
      <GamePicker
        focusState="focused"
        theme="K5"
        games={mockGames}
        onGameSelected={onGameSelected}
        onCancel={onCancel}
      />
    );

    const gameCard = screen.getByText('Math Challenge').closest('[role="button"]');
    fireEvent.click(gameCard!);

    expect(onGameSelected).toHaveBeenCalledWith('math-challenge');
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onGameSelected = vi.fn();
    const onCancel = vi.fn();

    render(
      <GamePicker
        focusState="focused"
        theme="K5"
        games={mockGames}
        onGameSelected={onGameSelected}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('filters games by category when focused', () => {
    const onGameSelected = vi.fn();
    const onCancel = vi.fn();

    render(
      <GamePicker
        focusState="focused"
        theme="K5"
        games={mockGames}
        onGameSelected={onGameSelected}
        onCancel={onCancel}
      />
    );

    // Click Math category
    const mathButton = screen.getByRole('button', { name: 'Math' });
    fireEvent.click(mathButton);

    // Should only show Math games
    expect(screen.getByText('Math Challenge')).toBeInTheDocument();
    expect(screen.queryByText('Calm Breathing')).not.toBeInTheDocument();
  });
});
