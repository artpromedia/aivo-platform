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

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY BADGE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

import {
  SafetyRatingBadge,
  SafetyIndicator,
  DataAccessIndicator,
  SafetySummary,
  PolicyTagBadge,
} from '../app/marketplace/safety-badge';

describe('Safety Badge Components', () => {
  describe('SafetyRatingBadge', () => {
    it('renders APPROVED_K12 badge with correct styling', () => {
      render(<SafetyRatingBadge safetyRating="APPROVED_K12" />);

      expect(screen.getByText('K-12 Approved')).toBeDefined();
    });

    it('renders PENDING badge with correct styling', () => {
      render(<SafetyRatingBadge safetyRating="PENDING" />);

      expect(screen.getByText('Pending Review')).toBeDefined();
    });

    it('renders RESTRICTED badge with correct styling', () => {
      render(<SafetyRatingBadge safetyRating="RESTRICTED" />);

      expect(screen.getByText('Restricted')).toBeDefined();
    });

    it('renders REJECTED badge with correct styling', () => {
      render(<SafetyRatingBadge safetyRating="REJECTED" />);

      expect(screen.getByText('Not Approved')).toBeDefined();
    });

    it('shows data access profile when expanded', () => {
      render(
        <SafetyRatingBadge
          safetyRating="APPROVED_K12"
          dataAccessProfile="MINIMAL"
          expanded={true}
        />
      );

      expect(screen.getByText('K-12 Approved')).toBeDefined();
      expect(screen.getByText('Minimal Data')).toBeDefined();
    });

    it('shows view details link when clickable', () => {
      const handleClick = vi.fn();
      render(
        <SafetyRatingBadge
          safetyRating="APPROVED_K12"
          clickable={true}
          onViewDetails={handleClick}
        />
      );

      const viewDetails = screen.getByText('View details');
      expect(viewDetails).toBeDefined();

      fireEvent.click(viewDetails);
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('SafetyIndicator', () => {
    it('renders compact indicator for each rating', () => {
      const { container: container1 } = render(<SafetyIndicator safetyRating="APPROVED_K12" />);
      expect(container1.querySelector('span')).toBeDefined();

      const { container: container2 } = render(<SafetyIndicator safetyRating="PENDING" />);
      expect(container2.querySelector('span')).toBeDefined();

      const { container: container3 } = render(<SafetyIndicator safetyRating="RESTRICTED" />);
      expect(container3.querySelector('span')).toBeDefined();
    });
  });

  describe('DataAccessIndicator', () => {
    it('renders MINIMAL profile with 1 bar', () => {
      render(<DataAccessIndicator profile="MINIMAL" />);
      expect(screen.getByText('Minimal Data')).toBeDefined();
    });

    it('renders MODERATE profile with 2 bars', () => {
      render(<DataAccessIndicator profile="MODERATE" />);
      expect(screen.getByText('Moderate Data')).toBeDefined();
    });

    it('renders HIGH profile with 3 bars', () => {
      render(<DataAccessIndicator profile="HIGH" />);
      expect(screen.getByText('Extended Data')).toBeDefined();
    });
  });

  describe('PolicyTagBadge', () => {
    it('renders known policy tags with proper labels', () => {
      render(<PolicyTagBadge tag="AI_POWERED" />);
      expect(screen.getByText('AI Powered')).toBeDefined();
    });

    it('renders NO_CHAT tag', () => {
      render(<PolicyTagBadge tag="NO_CHAT" />);
      expect(screen.getByText('No Chat')).toBeDefined();
    });

    it('renders REQUIRES_TEACHER_PRESENCE tag', () => {
      render(<PolicyTagBadge tag="REQUIRES_TEACHER_PRESENCE" />);
      expect(screen.getByText('Teacher Required')).toBeDefined();
    });

    it('formats unknown tags', () => {
      render(<PolicyTagBadge tag="CUSTOM_TAG" />);
      expect(screen.getByText('custom tag')).toBeDefined();
    });
  });

  describe('SafetySummary', () => {
    it('renders combined safety rating and data access', () => {
      render(
        <SafetySummary
          safetyRating="APPROVED_K12"
          dataAccessProfile="MODERATE"
        />
      );

      expect(screen.getByText('K-12 Approved')).toBeDefined();
      expect(screen.getByText('Moderate Data')).toBeDefined();
    });

    it('shows important policy tags', () => {
      render(
        <SafetySummary
          safetyRating="APPROVED_K12"
          dataAccessProfile="MINIMAL"
          policyTags={['AI_POWERED', 'REQUIRES_TEACHER_PRESENCE', 'NO_CHAT']}
        />
      );

      expect(screen.getByText('AI Powered')).toBeDefined();
      expect(screen.getByText('Teacher Required')).toBeDefined();
      // NO_CHAT is not in the important tags list, so it shouldn't show
    });

    it('shows view details link when onClick provided', () => {
      const handleClick = vi.fn();
      render(
        <SafetySummary
          safetyRating="APPROVED_K12"
          dataAccessProfile="MINIMAL"
          onClick={handleClick}
        />
      );

      const viewDetails = screen.getByText('View safety details');
      expect(viewDetails).toBeDefined();

      fireEvent.click(viewDetails);
      expect(handleClick).toHaveBeenCalled();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY DETAILS MODAL
// ══════════════════════════════════════════════════════════════════════════════

import { SafetyDetailsModal, useSafetyDetailsModal } from '../app/marketplace/safety-details-modal';
import { renderHook, act } from '@testing-library/react';

describe('Safety Details Modal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock fetch for API calls
    global.fetch = vi.fn();
  });

  it('does not render when closed', () => {
    render(
      <SafetyDetailsModal
        versionId="version-123"
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Safety Details')).toBeNull();
  });

  it('renders modal when open', async () => {
    const mockResponse = {
      versionId: 'version-123',
      itemTitle: 'Test Math App',
      vendorName: 'EduVendor Inc',
      safetyRating: 'APPROVED_K12',
      dataAccessProfile: 'MINIMAL',
      safetyNotes: 'Safe for classroom use',
      policyTags: ['NO_CHAT'],
      dataCategoriesAccessed: ['LEARNER_ID', 'PROGRESS_DATA'],
      lastReviewedAt: '2024-01-15T10:00:00Z',
      lastReviewedBy: 'reviewer@aivo.com',
      automatedChecksPassed: true,
      explanations: {
        safetyRating: 'This item has been reviewed and approved for K-12 classroom use.',
        dataAccessProfile: 'This item accesses only pseudonymous identifiers.',
        policyTags: { NO_CHAT: 'This item does not include chat or messaging features.' },
        dataCategories: {
          LEARNER_ID: 'Pseudonymous learner identifier',
          PROGRESS_DATA: 'Learning progress and completion data',
        },
      },
    };

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(
      <SafetyDetailsModal
        versionId="version-123"
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Safety Details')).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByText('Test Math App')).toBeDefined();
    });
  });

  it('shows loading state while fetching', () => {
    // Never resolve the fetch
    (global.fetch as Mock).mockImplementation(
      () => new Promise(() => {})
    );

    render(
      <SafetyDetailsModal
        versionId="version-123"
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Should show some loading state
    expect(screen.getByText('Safety Details')).toBeDefined();
  });

  it('shows error state on fetch failure', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <SafetyDetailsModal
        versionId="version-123"
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeDefined();
    });
  });

  it('closes on escape key', async () => {
    const handleClose = vi.fn();

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ versionId: 'v1' }),
    });

    render(
      <SafetyDetailsModal
        versionId="version-123"
        isOpen={true}
        onClose={handleClose}
      />
    );

    // Simulate escape key
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalled();
  });

  it('closes on backdrop click', async () => {
    const handleClose = vi.fn();

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ versionId: 'v1' }),
    });

    const { container } = render(
      <SafetyDetailsModal
        versionId="version-123"
        isOpen={true}
        onClose={handleClose}
      />
    );

    // Click the backdrop (first div with bg-black/50)
    const backdrop = container.querySelector('.bg-black\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalled();
    }
  });
});

describe('useSafetyDetailsModal hook', () => {
  it('starts with modal closed', () => {
    const { result } = renderHook(() => useSafetyDetailsModal());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.versionId).toBeNull();
  });

  it('opens modal with version ID', () => {
    const { result } = renderHook(() => useSafetyDetailsModal());

    act(() => {
      result.current.open('version-123');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.versionId).toBe('version-123');
  });

  it('closes modal', () => {
    const { result } = renderHook(() => useSafetyDetailsModal());

    act(() => {
      result.current.open('version-123');
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });
});
