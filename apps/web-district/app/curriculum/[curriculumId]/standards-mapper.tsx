'use client';

/**
 * Standards Mapper Component
 *
 * Allows mapping curriculum to educational standards with coverage tracking.
 */

import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../providers';
import {
  type StandardAlignment,
  type SearchableStandard,
  type StandardsCoverageReport,
  getStandardsAlignment,
  getStandardsCoverageReport,
  searchStandards,
  alignStandardToCurriculum,
  removeStandardAlignment,
  FRAMEWORKS,
  getFrameworkLabel,
} from '../../../lib/curriculum-api';

interface StandardsMapperProps {
  curriculumId: string;
}

export function StandardsMapper({ curriculumId }: StandardsMapperProps) {
  const { tenantId } = useAuth();
  const [standards, setStandards] = useState<StandardAlignment[]>([]);
  const [coverage, setCoverage] = useState<StandardsCoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<string>('CCSS');

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;

      setLoading(true);
      setError(null);

      try {
        const accessToken = 'mock-token';
        const [alignmentResult, coverageResult] = await Promise.all([
          getStandardsAlignment(curriculumId, tenantId, accessToken),
          getStandardsCoverageReport(curriculumId, tenantId, accessToken),
        ]);
        setStandards(alignmentResult.standards);
        setCoverage(coverageResult.report);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load standards');
        // Use mock data for demonstration
        setStandards(MOCK_STANDARDS);
        setCoverage(MOCK_COVERAGE);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [curriculumId, tenantId]);

  const handleRemoveStandard = useCallback(
    async (alignmentId: string) => {
      if (!tenantId) return;

      try {
        const accessToken = 'mock-token';
        await removeStandardAlignment(alignmentId, tenantId, accessToken);
        setStandards((prev) => prev.filter((s) => s.id !== alignmentId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove standard');
      }
    },
    [tenantId]
  );

  const handleAddStandard = useCallback(
    async (standard: SearchableStandard) => {
      if (!tenantId) return;

      try {
        const accessToken = 'mock-token';
        const result = await alignStandardToCurriculum(curriculumId, tenantId, accessToken, {
          standardCode: standard.code,
          standardDescription: standard.description,
          framework: standard.framework,
          alignmentLevel: 'primary',
        });
        setStandards((prev) => [...prev, result.alignment]);
        setShowAddModal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add standard');
      }
    },
    [curriculumId, tenantId]
  );

  if (loading) {
    return <MapperSkeleton />;
  }

  const groupedStandards = groupByFramework(standards);

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-lg font-semibold">Standards Alignment</h2>
          <p className="text-sm text-muted">
            {standards.length} standard{standards.length !== 1 ? 's' : ''} mapped
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Standard
        </button>
      </div>

      {/* Coverage Progress */}
      {coverage && (
        <div className="border-b border-border p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Standards Coverage</span>
            <span className="font-medium">{coverage.coveragePercentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${coverage.coveragePercentage}%` }}
            />
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted">
            <span>
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Primary: {coverage.standardsByLevel.primary}
            </span>
            <span>
              <span className="inline-block h-2 w-2 rounded-full bg-purple-500" /> Secondary: {coverage.standardsByLevel.secondary}
            </span>
            <span>
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400" /> Supporting: {coverage.standardsByLevel.supporting}
            </span>
          </div>
        </div>
      )}

      {/* Standards List */}
      <div className="max-h-80 overflow-y-auto">
        {standards.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <p>No standards mapped yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Add your first standard
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(groupedStandards).map(([framework, frameworkStandards]) => (
              <div key={framework}>
                <div className="bg-surface-muted px-4 py-2">
                  <span className="text-sm font-medium">{getFrameworkLabel(framework)}</span>
                  <span className="ml-2 text-xs text-muted">
                    ({frameworkStandards.length} standard{frameworkStandards.length !== 1 ? 's' : ''})
                  </span>
                </div>
                {frameworkStandards.map((standard) => (
                  <StandardItem
                    key={standard.id}
                    standard={standard}
                    onRemove={() => handleRemoveStandard(standard.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Standard Modal */}
      {showAddModal && (
        <AddStandardModal
          selectedFramework={selectedFramework}
          onFrameworkChange={setSelectedFramework}
          onAdd={handleAddStandard}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function StandardItem({
  standard,
  onRemove,
}: {
  standard: StandardAlignment;
  onRemove: () => void;
}) {
  const levelColors = {
    primary: 'bg-blue-100 text-blue-700',
    secondary: 'bg-purple-100 text-purple-700',
    supporting: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="flex items-start justify-between gap-3 p-4 hover:bg-surface-muted/50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs font-medium">
            {standard.standardCode}
          </code>
          <span className={`rounded-full px-2 py-0.5 text-xs ${levelColors[standard.alignmentLevel]}`}>
            {standard.alignmentLevel}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted line-clamp-2">{standard.standardDescription}</p>
      </div>
      <button
        onClick={onRemove}
        className="flex-shrink-0 rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
        title="Remove standard"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function AddStandardModal({
  selectedFramework,
  onFrameworkChange,
  onAdd,
  onClose,
}: {
  selectedFramework: string;
  onFrameworkChange: (framework: string) => void;
  onAdd: (standard: SearchableStandard) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchableStandard[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setSearching(true);
      try {
        const accessToken = 'mock-token';
        const response = await searchStandards(searchQuery, accessToken, {
          framework: selectedFramework,
        });
        setResults(response.standards);
      } catch {
        // Use mock results
        setResults(
          MOCK_SEARCHABLE_STANDARDS.filter(
            (s) =>
              s.framework === selectedFramework &&
              (s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        );
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedFramework]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold">Add Standard</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-muted">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Framework Selection */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Framework</label>
            <select
              value={selectedFramework}
              onChange={(e) => onFrameworkChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.entries(FRAMEWORKS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Search Standards</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or description..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {searching ? (
              <div className="p-4 text-center text-sm text-muted">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted">
                {searchQuery.length < 2
                  ? 'Type at least 2 characters to search'
                  : 'No standards found'}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((standard) => (
                  <button
                    key={standard.code}
                    onClick={() => onAdd(standard)}
                    className="flex w-full flex-col gap-1 p-3 text-left transition hover:bg-surface-muted"
                  >
                    <code className="text-xs font-medium text-primary">{standard.code}</code>
                    <p className="text-sm text-muted line-clamp-2">{standard.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapperSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="space-y-1">
          <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-lg bg-surface-muted" />
      </div>
      <div className="p-4">
        <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-surface-muted/50" />
        ))}
      </div>
    </div>
  );
}

function groupByFramework(standards: StandardAlignment[]): Record<string, StandardAlignment[]> {
  return standards.reduce(
    (acc, standard) => {
      const framework = standard.framework;
      if (!acc[framework]) acc[framework] = [];
      acc[framework].push(standard);
      return acc;
    },
    {} as Record<string, StandardAlignment[]>
  );
}

// Mock data
const MOCK_STANDARDS: StandardAlignment[] = [
  {
    id: 's1',
    standardCode: 'CCSS.MATH.HSA.REI.A.1',
    standardDescription: 'Explain each step in solving a simple equation as following from the equality of numbers asserted at the previous step',
    framework: 'CCSS',
    alignmentLevel: 'primary',
    createdAt: '2024-01-15',
  },
  {
    id: 's2',
    standardCode: 'CCSS.MATH.HSA.REI.B.3',
    standardDescription: 'Solve linear equations and inequalities in one variable, including equations with coefficients represented by letters',
    framework: 'CCSS',
    alignmentLevel: 'primary',
    createdAt: '2024-01-15',
  },
  {
    id: 's3',
    standardCode: 'CCSS.MATH.HSA.CED.A.1',
    standardDescription: 'Create equations and inequalities in one variable and use them to solve problems',
    framework: 'CCSS',
    alignmentLevel: 'secondary',
    createdAt: '2024-01-15',
  },
];

const MOCK_COVERAGE: StandardsCoverageReport = {
  curriculumId: '1',
  framework: 'CCSS',
  totalStandards: 20,
  coveredStandards: 12,
  coveragePercentage: 60,
  standardsByLevel: {
    primary: 5,
    secondary: 4,
    supporting: 3,
  },
  uncoveredStandards: [],
};

const MOCK_SEARCHABLE_STANDARDS: SearchableStandard[] = [
  { code: 'CCSS.MATH.HSA.REI.A.2', description: 'Solve simple rational and radical equations in one variable', framework: 'CCSS' },
  { code: 'CCSS.MATH.HSA.REI.B.4', description: 'Solve quadratic equations in one variable', framework: 'CCSS' },
  { code: 'CCSS.MATH.HSA.REI.C.5', description: 'Prove that, given a system of two equations in two variables', framework: 'CCSS' },
  { code: 'CCSS.MATH.HSA.SSE.A.1', description: 'Interpret expressions that represent a quantity in terms of its context', framework: 'CCSS' },
  { code: 'NGSS.MS-LS1-1', description: 'Conduct an investigation to provide evidence that living things are made of cells', framework: 'NGSS' },
  { code: 'NGSS.MS-LS1-2', description: 'Develop and use a model to describe the function of a cell as a whole', framework: 'NGSS' },
];
