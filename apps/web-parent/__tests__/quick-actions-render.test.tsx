import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { QuickActions } from '@/components/dashboard/quick-actions';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('QuickActions component', () => {
  it('renders the Add Child action', () => {
    render(<QuickActions childId="test-child-1" />);
    expect(screen.getByText('Add Child')).toBeDefined();
    expect(screen.getByText('Add another learner')).toBeDefined();
  });

  it('renders core quick actions', () => {
    render(<QuickActions childId="test-child-1" />);
    expect(screen.getByText('Messages')).toBeDefined();
    expect(screen.getByText('Schedule Session')).toBeDefined();
    expect(screen.getByText('Download Report')).toBeDefined();
    expect(screen.getByText('Achievements')).toBeDefined();
  });

  it('navigates to /family/add-child when Add Child is clicked', () => {
    render(<QuickActions childId="test-child-1" />);
    const addChildButton = screen.getByText('Add Child').closest('button');
    expect(addChildButton).toBeDefined();
    fireEvent.click(addChildButton!);
    expect(pushMock).toHaveBeenCalledWith('/family/add-child');
  });

  it('calls onAddChild callback when provided', () => {
    const onAddChild = vi.fn();
    render(<QuickActions childId="test-child-1" onAddChild={onAddChild} />);
    const addChildButton = screen.getByText('Add Child').closest('button');
    fireEvent.click(addChildButton!);
    expect(onAddChild).toHaveBeenCalled();
  });

  it('displays unread message badge', () => {
    render(<QuickActions childId="test-child-1" unreadMessages={3} />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('renders with success variant styling for Add Child', () => {
    render(<QuickActions childId="test-child-1" />);
    const addChildButton = screen.getByText('Add Child').closest('button');
    expect(addChildButton?.className).toContain('green');
  });
});
