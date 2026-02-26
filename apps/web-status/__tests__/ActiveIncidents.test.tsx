import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ActiveIncidents } from '@/components/ActiveIncidents';
import type { Incident } from '@/lib/types';

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 'inc-1',
    title: 'Test Incident',
    severity: 'minor',
    status: 'investigating',
    message: 'We are looking into it.',
    components: ['api'],
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-06-01T01:00:00Z',
    resolved_at: null,
    is_auto: false,
    ...overrides,
  };
}

describe('ActiveIncidents', () => {
  it('renders heading', () => {
    render(<ActiveIncidents incidents={[]} />);
    expect(screen.getByText('Active Incidents')).toBeDefined();
  });

  it('renders incident title', () => {
    const incidents = [makeIncident({ title: 'API is slow' })];
    render(<ActiveIncidents incidents={incidents} />);
    expect(screen.getByText('API is slow')).toBeDefined();
  });

  it('renders incident message', () => {
    const incidents = [makeIncident({ message: 'Elevated latency observed.' })];
    render(<ActiveIncidents incidents={incidents} />);
    expect(screen.getByText('Elevated latency observed.')).toBeDefined();
  });

  it('renders multiple incidents', () => {
    const incidents = [
      makeIncident({ id: 'inc-1', title: 'First' }),
      makeIncident({ id: 'inc-2', title: 'Second' }),
    ];
    render(<ActiveIncidents incidents={incidents} />);
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
  });

  it('renders links to incident detail pages', () => {
    const incidents = [makeIncident({ id: 'inc-99' })];
    const { container } = render(<ActiveIncidents incidents={incidents} />);
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/incidents/inc-99');
  });

  it('renders all severity levels without error', () => {
    const severities = ['minor', 'major', 'critical'] as const;
    for (const severity of severities) {
      const { unmount } = render(
        <ActiveIncidents incidents={[makeIncident({ severity })]} />,
      );
      unmount();
    }
  });

  it('displays status text', () => {
    const incidents = [makeIncident({ status: 'monitoring' })];
    render(<ActiveIncidents incidents={incidents} />);
    expect(screen.getByText('monitoring')).toBeDefined();
  });
});
