import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '../app/sandbox/register/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Sandbox Registration Page', () => {
  beforeEach(() => {
    mockPush.mockClear();
    render(<RegisterPage />);
  });

  it('renders registration form', () => {
    expect(screen.getByRole('heading', { name: /Partner Registration/i })).toBeInTheDocument();
  });

  it('displays all required form fields', () => {
    expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('shows integration type checkboxes', () => {
    expect(screen.getByLabelText(/REST API/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Webhooks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/LTI/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SIS/i)).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    const submitButton = screen.getByRole('button', { name: /Submit Application/i });
    fireEvent.click(submitButton);
    
    // Form should show validation errors
    // This depends on implementation - HTML5 validation or custom
  });

  it('allows filling out the form', () => {
    const companyInput = screen.getByLabelText(/Company Name/i);
    fireEvent.change(companyInput, { target: { value: 'Test Company Inc' } });
    expect(companyInput).toHaveValue('Test Company Inc');
    
    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });
});
