/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Static imports with type assertions
import { CatalogFilters } from '../app/marketplace/filters';
import { InstallationsFilters } from '../app/marketplace/installations/filters';
import { InstallModal } from '../app/marketplace/items/[slug]/install-modal';
import { MarketplaceSearch } from '../app/marketplace/search';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock the auth context
vi.mock('../app/providers', () => ({
  useAuth: () => ({
    tenantId: 'tenant-123',
    isAuthenticated: true,
    userName: 'Test Admin',
  }),
}));

// Mock the API
vi.mock('../lib/marketplace-api', async () => {
  const actual = await vi.importActual('../lib/marketplace-api');
  return {
    ...(actual as object),
    searchCatalog: vi.fn(),
    listInstallations: vi.fn(),
    getItemBySlug: vi.fn(),
  };
});

describe('Marketplace Catalog Page', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
  };
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.resetAllMocks();
    (useRouter as Mock).mockReturnValue(mockRouter);
    (useSearchParams as Mock).mockReturnValue(mockSearchParams);
  });

  describe('Search Component', () => {
    it('renders search input', () => {
      render(<MarketplaceSearch />);

      const input = screen.getByPlaceholderText(/search/i);
      expect(input).toBeDefined();
    });

    it('updates URL on search input', async () => {
      render(<MarketplaceSearch />);

      const input = screen.getByPlaceholderText(/search/i);
      fireEvent.change(input, { target: { value: 'math' } });

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockRouter.push).toHaveBeenCalled();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Filters Component', () => {
    it('renders filter options', () => {
      render(<CatalogFilters />);

      // Check for type filter
      expect(screen.getByText('Content Type')).toBeDefined();
      expect(screen.getByText('Content Packs')).toBeDefined();
      expect(screen.getByText('Embedded Tools')).toBeDefined();

      // Check for subject filter
      expect(screen.getByText('Subjects')).toBeDefined();
      expect(screen.getByText('Mathematics')).toBeDefined();

      // Check for grade band filter
      expect(screen.getByText('Grade Bands')).toBeDefined();
    });

    it('clears filters when clear button clicked', () => {
      // Set up search params with filters
      const paramsWithFilters = new URLSearchParams('type=CONTENT_PACK');
      (useSearchParams as Mock).mockReturnValue(paramsWithFilters);

      render(<CatalogFilters />);

      const clearButton = screen.queryByText(/clear filters/i);
      if (clearButton) {
        fireEvent.click(clearButton);
        expect(mockRouter.push).toHaveBeenCalledWith('/marketplace');
      }
    });
  });
});

describe('Marketplace Installations Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const mockRouter = { push: vi.fn(), replace: vi.fn() };
    const mockSearchParams = new URLSearchParams();
    (useRouter as Mock).mockReturnValue(mockRouter);
    (useSearchParams as Mock).mockReturnValue(mockSearchParams);
  });

  describe('InstallationsFilters Component', () => {
    it('renders status filter options', () => {
      render(<InstallationsFilters />);

      expect(screen.getByText('Status')).toBeDefined();
      expect(screen.getByText('All Statuses')).toBeDefined();
      expect(screen.getByText('Active')).toBeDefined();
      expect(screen.getByText('Pending Approval')).toBeDefined();
      expect(screen.getByText('Disabled')).toBeDefined();
    });

    it('renders scope filter options', () => {
      render(<InstallationsFilters />);

      expect(screen.getByText('Scope')).toBeDefined();
      expect(screen.getByText('All Scopes')).toBeDefined();
      expect(screen.getByText('District-wide')).toBeDefined();
      expect(screen.getByText('School')).toBeDefined();
    });

    it('renders type filter options', () => {
      render(<InstallationsFilters />);

      expect(screen.getByText('Type')).toBeDefined();
      expect(screen.getByText('All Types')).toBeDefined();
    });
  });
});

describe('Install Modal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const mockRouter = { push: vi.fn(), replace: vi.fn() };
    (useRouter as Mock).mockReturnValue(mockRouter);
  });

  it('renders install scope options when open', () => {
    const mockItem = {
      id: 'item-123',
      slug: 'test-item',
      title: 'Test Item',
      shortDescription: 'Test description',
      description: 'Full description',
      iconUrl: 'https://example.com/icon.png',
      itemType: 'CONTENT_PACK' as const,
      vendor: { id: 'v1', name: 'Test Vendor' },
      currentVersion: { id: 'ver1', version: '1.0.0' },
      subjects: ['MATHEMATICS'],
      gradeBands: ['GRADES_6_8'],
      tags: [],
      rating: 4.5,
      reviewCount: 100,
      installCount: 500,
      safetyCertified: true,
      publishedAt: '2024-01-01',
    };

    render(
      <InstallModal
        open={true}
        onClose={() => {
          // no-op
        }}
        item={mockItem}
      />
    );

    // Check modal is rendered
    expect(screen.getByText(/install/i)).toBeDefined();
    expect(screen.getByText(/Test Item/)).toBeDefined();
  });
});
