import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubjectCard } from './SubjectCard';
import type { SubjectInfo } from '../../types';

const mockSubject: SubjectInfo = {
  id: 'math',
  name: 'Math',
  emoji: '🧮',
  color: 'from-blue-500 to-cyan-500',
};

describe('SubjectCard', () => {
  it('renders subject info correctly', () => {
    render(<SubjectCard subject={mockSubject} />);

    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('🧮')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SubjectCard subject={mockSubject} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledWith('math');
  });

  it('shows checkmark when selected', () => {
    render(<SubjectCard subject={mockSubject} selected />);

    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('does not show checkmark when not selected', () => {
    render(<SubjectCard subject={mockSubject} selected={false} />);

    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    const onClick = vi.fn();
    render(<SubjectCard subject={mockSubject} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onClick).toHaveBeenCalledWith('math');
  });

  it('handles space key', () => {
    const onClick = vi.fn();
    render(<SubjectCard subject={mockSubject} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });

    expect(onClick).toHaveBeenCalledWith('math');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<SubjectCard subject={mockSubject} size="sm" />);
    expect(screen.getByRole('button')).toHaveClass('p-3');

    rerender(<SubjectCard subject={mockSubject} size="md" />);
    expect(screen.getByRole('button')).toHaveClass('p-4');

    rerender(<SubjectCard subject={mockSubject} size="lg" />);
    expect(screen.getByRole('button')).toHaveClass('p-6');
  });
});
