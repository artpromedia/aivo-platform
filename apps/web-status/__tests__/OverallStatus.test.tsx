import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OverallStatus } from '@/components/OverallStatus';
import type { StatusLevel } from '@/lib/types';

describe('OverallStatus', () => {
  it('shows "All Systems Operational" when operational', () => {
    render(<OverallStatus status="operational" updatedAt="2024-01-01T00:00:00Z" />);
    expect(screen.getByText('All Systems Operational')).toBeDefined();
  });

  it('shows label text for non-operational status', () => {
    render(<OverallStatus status="major_outage" updatedAt="2024-01-01T00:00:00Z" />);
    expect(screen.getByText('Major Outage')).toBeDefined();
  });

  it('shows degraded performance label', () => {
    render(<OverallStatus status="degraded" updatedAt="2024-01-01T00:00:00Z" />);
    expect(screen.getByText('Degraded Performance')).toBeDefined();
  });

  it('shows maintenance label', () => {
    render(<OverallStatus status="maintenance" updatedAt="2024-01-01T00:00:00Z" />);
    expect(screen.getByText('Under Maintenance')).toBeDefined();
  });

  it('displays last updated time', () => {
    render(<OverallStatus status="operational" updatedAt="2024-06-15T12:30:00Z" />);
    // The component uses new Date().toLocaleString(), so check partial text
    expect(screen.getByText(/Last updated/)).toBeDefined();
  });

  it('renders all status levels without error', () => {
    const levels: StatusLevel[] = [
      'operational',
      'degraded',
      'partial_outage',
      'major_outage',
      'maintenance',
    ];
    for (const level of levels) {
      const { unmount } = render(
        <OverallStatus status={level} updatedAt="2024-01-01T00:00:00Z" />,
      );
      unmount();
    }
  });
});
