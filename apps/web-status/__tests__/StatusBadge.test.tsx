import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StatusBadge } from '@/components/StatusBadge';
import type { StatusLevel } from '@/lib/types';

describe('StatusBadge', () => {
  it('renders operational label', () => {
    render(<StatusBadge status="operational" />);
    expect(screen.getByText('Operational')).toBeDefined();
  });

  it('renders degraded label', () => {
    render(<StatusBadge status="degraded" />);
    expect(screen.getByText('Degraded Performance')).toBeDefined();
  });

  it('renders major_outage label', () => {
    render(<StatusBadge status="major_outage" />);
    expect(screen.getByText('Major Outage')).toBeDefined();
  });

  it('renders maintenance label', () => {
    render(<StatusBadge status="maintenance" />);
    expect(screen.getByText('Under Maintenance')).toBeDefined();
  });

  it('renders all 5 statuses without error', () => {
    const levels: StatusLevel[] = [
      'operational',
      'degraded',
      'partial_outage',
      'major_outage',
      'maintenance',
    ];
    for (const level of levels) {
      const { unmount } = render(<StatusBadge status={level} />);
      unmount();
    }
  });

  it('supports sm size', () => {
    const { container } = render(<StatusBadge status="operational" size="sm" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain('text-xs');
  });

  it('defaults to md size', () => {
    const { container } = render(<StatusBadge status="operational" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain('text-sm');
  });
});
