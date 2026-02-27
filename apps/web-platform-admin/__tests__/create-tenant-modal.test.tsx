import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CreateTenantModal } from '@/components/create-tenant-modal';

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: mockRefresh,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateTenantModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreated: vi.fn(),
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CreateTenantModal isOpen={false} onClose={vi.fn()} onCreated={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal when isOpen is true', () => {
    render(<CreateTenantModal {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Create Tenant' })).toBeDefined();
    expect(screen.getByLabelText('Tenant Name')).toBeDefined();
    expect(screen.getByLabelText('Tenant Type')).toBeDefined();
    expect(screen.getByLabelText('Primary Domain')).toBeDefined();
    expect(screen.getByLabelText('Admin Email')).toBeDefined();
  });

  it('renders all tenant type options', () => {
    render(<CreateTenantModal {...defaultProps} />);

    const select = screen.getByLabelText('Tenant Type') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);

    expect(options).toContain('DISTRICT');
    expect(options).toContain('CHARTER');
    expect(options).toContain('PRIVATE_SCHOOL');
    expect(options).toContain('ENTERPRISE');
    expect(options).toContain('INDIVIDUAL');
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<CreateTenantModal isOpen={true} onClose={onClose} onCreated={vi.fn()} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits form data and calls onCreated on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'tenant-new' }),
    });

    const onCreated = vi.fn();
    const onClose = vi.fn();
    render(<CreateTenantModal isOpen={true} onClose={onClose} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Tenant Name'), {
      target: { value: 'North Valley' },
    });
    fireEvent.change(screen.getByLabelText('Primary Domain'), {
      target: { value: 'northvalley.aivo.com' },
    });
    fireEvent.change(screen.getByLabelText('Admin Email'), {
      target: { value: 'admin@northvalley.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Tenant' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/tenants', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('displays error on failed submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Domain already exists' }),
    });

    render(<CreateTenantModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Tenant Name'), {
      target: { value: 'Duplicate' },
    });
    fireEvent.change(screen.getByLabelText('Primary Domain'), {
      target: { value: 'existing.aivo.com' },
    });
    fireEvent.change(screen.getByLabelText('Admin Email'), {
      target: { value: 'a@b.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Tenant' }));

    await waitFor(() => {
      expect(screen.getByText('Domain already exists')).toBeDefined();
    });
  });

  it('shows fallback error when API returns non-JSON error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject(new Error('parse error')),
    });

    render(<CreateTenantModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Tenant Name'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByLabelText('Primary Domain'), {
      target: { value: 'test.com' },
    });
    fireEvent.change(screen.getByLabelText('Admin Email'), {
      target: { value: 'a@b.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Tenant' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to create tenant')).toBeDefined();
    });
  });

  it('disables submit button while submitting', async () => {
    let resolveSubmit: () => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSubmit = () => resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
    );

    render(<CreateTenantModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Tenant Name'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByLabelText('Primary Domain'), {
      target: { value: 'test.com' },
    });
    fireEvent.change(screen.getByLabelText('Admin Email'), {
      target: { value: 'a@b.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Tenant' }));

    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeDefined();
    });

    // Resolve to cleanup
    resolveSubmit!();
  });
});
