/**
 * Chart Components Tests
 *
 * Tests for the analytics chart components:
 * - TrendLineChart
 * - MasteryDistributionChart
 * - RiskDistributionChart
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children, height }: { children: React.ReactNode; height?: number }) => (
    <div data-testid="responsive-container" style={{ height }}>
      {children}
    </div>
  ),
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-point-count={data?.length}>
      {children}
    </div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-point-count={data?.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: { dataKey: string; stroke: string }) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  Pie: ({ data, dataKey }: { data: unknown[]; dataKey: string }) => (
    <div data-testid="pie" data-key={dataKey} data-entries={data?.length} />
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ domain }: { domain?: number[] }) => (
    <div data-testid="y-axis" data-domain={domain?.join(',')} />
  ),
  Tooltip: ({ content }: { content: React.FC }) => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Legend: () => <div data-testid="legend" />,
  Cell: ({ fill }: { fill: string }) => <div data-testid="cell" data-fill={fill} />,
  ReferenceLine: ({ y, label }: { y: number; label: string }) => (
    <div data-testid="reference-line" data-y={y} data-label={label} />
  ),
}));

import { TrendLineChart } from '@/components/analytics/charts/TrendLineChart';
import { MasteryDistributionChart } from '@/components/analytics/charts/MasteryDistributionChart';
import { RiskDistributionChart } from '@/components/analytics/charts/RiskDistributionChart';

describe('TrendLineChart', () => {
  const mockData = [
    { date: new Date('2025-12-01'), mastery: 60, engagement: 70 },
    { date: new Date('2025-12-08'), mastery: 65, engagement: 72 },
    { date: new Date('2025-12-15'), mastery: 70, engagement: 68 },
    { date: new Date('2025-12-22'), mastery: 75, engagement: 75 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders line chart with data points', () => {
    render(<TrendLineChart data={mockData} />);

    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAttribute('data-point-count', '4');
  });

  it('renders mastery line when showMastery is true', () => {
    render(<TrendLineChart data={mockData} showMastery />);

    expect(screen.getByTestId('line-mastery')).toBeInTheDocument();
  });

  it('renders engagement line when showEngagement is true', () => {
    render(<TrendLineChart data={mockData} showEngagement />);

    expect(screen.getByTestId('line-engagement')).toBeInTheDocument();
  });

  it('renders both lines by default', () => {
    render(<TrendLineChart data={mockData} showMastery showEngagement />);

    expect(screen.getByTestId('line-mastery')).toBeInTheDocument();
    expect(screen.getByTestId('line-engagement')).toBeInTheDocument();
  });

  it('uses semantic figure element for accessibility', () => {
    render(<TrendLineChart data={mockData} title="Trend Chart" />);

    expect(screen.getByRole('figure')).toBeInTheDocument();
  });

  it('displays title when provided', () => {
    render(<TrendLineChart data={mockData} title="Class Progress Over Time" />);

    expect(screen.getByText('Class Progress Over Time')).toBeInTheDocument();
  });

  it('applies custom height when provided', () => {
    render(<TrendLineChart data={mockData} height={400} />);

    const container = screen.getByTestId('responsive-container');
    expect(container).toHaveStyle({ height: '400px' });
  });

  it('handles empty data gracefully', () => {
    render(<TrendLineChart data={[]} />);

    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('displays loading state when loading prop is true', () => {
    render(<TrendLineChart data={mockData} loading />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('MasteryDistributionChart', () => {
  const mockDistribution = [
    { level: 'Mastered', count: 15, percentage: 37.5, color: '#22c55e' },
    { level: 'Proficient', count: 10, percentage: 25, color: '#84cc16' },
    { level: 'Developing', count: 8, percentage: 20, color: '#f59e0b' },
    { level: 'Beginning', count: 7, percentage: 17.5, color: '#ef4444' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pie chart with distribution data', () => {
    render(<MasteryDistributionChart data={mockDistribution} />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('renders correct number of pie segments', () => {
    render(<MasteryDistributionChart data={mockDistribution} />);

    const pie = screen.getByTestId('pie');
    expect(pie).toHaveAttribute('data-entries', '4');
  });

  it('uses semantic figure element', () => {
    render(<MasteryDistributionChart data={mockDistribution} title="Distribution" />);

    expect(screen.getByRole('figure')).toBeInTheDocument();
  });

  it('displays legend', () => {
    render(<MasteryDistributionChart data={mockDistribution} showLegend />);

    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('shows title when provided', () => {
    render(<MasteryDistributionChart data={mockDistribution} title="Mastery Levels" />);

    expect(screen.getByText('Mastery Levels')).toBeInTheDocument();
  });

  it('displays center label when showCenterLabel is true', () => {
    render(<MasteryDistributionChart data={mockDistribution} showCenterLabel totalStudents={40} />);

    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText(/students/i)).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<MasteryDistributionChart data={[]} />);

    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<MasteryDistributionChart data={mockDistribution} loading />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('RiskDistributionChart', () => {
  const mockRiskData = [
    { level: 'Low Risk', count: 20, percentage: 50, color: '#22c55e' },
    { level: 'Medium Risk', count: 12, percentage: 30, color: '#f59e0b' },
    { level: 'High Risk', count: 8, percentage: 20, color: '#ef4444' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bar chart with risk data', () => {
    render(<RiskDistributionChart data={mockRiskData} />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders correct number of bars', () => {
    render(<RiskDistributionChart data={mockRiskData} />);

    const chart = screen.getByTestId('bar-chart');
    expect(chart).toHaveAttribute('data-point-count', '3');
  });

  it('uses semantic figure element', () => {
    render(<RiskDistributionChart data={mockRiskData} title="Risk Distribution" />);

    expect(screen.getByRole('figure')).toBeInTheDocument();
  });

  it('shows title when provided', () => {
    render(<RiskDistributionChart data={mockRiskData} title="Student Risk Levels" />);

    expect(screen.getByText('Student Risk Levels')).toBeInTheDocument();
  });

  it('displays count bar when showCount is true', () => {
    render(<RiskDistributionChart data={mockRiskData} showCount />);

    expect(screen.getByTestId('bar-count')).toBeInTheDocument();
  });

  it('displays percentage bar when showPercentage is true', () => {
    render(<RiskDistributionChart data={mockRiskData} showPercentage />);

    expect(screen.getByTestId('bar-percentage')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<RiskDistributionChart data={[]} />);

    expect(screen.getByText(/no data available/i)).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<RiskDistributionChart data={mockRiskData} loading />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies custom height', () => {
    render(<RiskDistributionChart data={mockRiskData} height={300} />);

    const container = screen.getByTestId('responsive-container');
    expect(container).toHaveStyle({ height: '300px' });
  });

  it('renders horizontal layout by default', () => {
    render(<RiskDistributionChart data={mockRiskData} />);

    // Horizontal bar chart should have level on Y axis
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('renders vertical layout when specified', () => {
    render(<RiskDistributionChart data={mockRiskData} layout="vertical" />);

    // Vertical bar chart should have level on X axis
    expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'level');
  });
});
