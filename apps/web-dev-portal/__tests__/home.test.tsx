import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../app/page';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Developer Portal Homepage', () => {
  beforeEach(() => {
    render(<HomePage />);
  });

  it('renders the main heading', () => {
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Build powerful integrations/i
    );
  });

  it('displays the hero description', () => {
    expect(screen.getByText(/Connect your systems/i)).toBeInTheDocument();
  });

  it('has a link to documentation', () => {
    const docsLink = screen.getByRole('link', { name: /Read the Docs/i });
    expect(docsLink).toHaveAttribute('href', '/docs');
  });

  it('has a link to sandbox', () => {
    const sandboxLink = screen.getByRole('link', { name: /Get Sandbox Access/i });
    expect(sandboxLink).toHaveAttribute('href', '/sandbox');
  });

  it('displays feature cards', () => {
    expect(screen.getByText(/REST APIs/i)).toBeInTheDocument();
    expect(screen.getByText(/Webhooks/i)).toBeInTheDocument();
    expect(screen.getByText(/LMS Integration/i)).toBeInTheDocument();
    expect(screen.getByText(/SIS Rostering/i)).toBeInTheDocument();
  });

  it('displays getting started section', () => {
    expect(screen.getByText(/Get Started in Minutes/i)).toBeInTheDocument();
  });
});
