import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VirtualManipulatives } from '../app/(learning)/math-support/components/VirtualManipulatives';
import * as mathApi from '../lib/math-api';

// Mock the math API
vi.mock('../lib/math-api');

const mockManipulatives = [
  {
    id: 'manip-1',
    name: 'Fraction Bars',
    type: 'fraction-bars' as const,
    description: 'Visualize fractions with colored bars',
    grade_level: '3-5',
    icon: '🔲',
  },
  {
    id: 'manip-2',
    name: 'Number Line',
    type: 'number-line' as const,
    description: 'Explore numbers on a visual line',
    grade_level: '1-3',
    icon: '📏',
  },
  {
    id: 'manip-3',
    name: 'Base-Ten Blocks',
    type: 'base-ten-blocks' as const,
    description: 'Understand place value',
    grade_level: '1-4',
    icon: '🧱',
  },
];

describe('VirtualManipulatives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mathApi.getManipulatives).mockResolvedValue(mockManipulatives);
    vi.mocked(mathApi.saveManipulativeState).mockResolvedValue(undefined);
  });

  it('should render virtual manipulatives component', async () => {
    render(<VirtualManipulatives learnerId="learner-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Fraction Bars')).toBeInTheDocument();
    });
  });

  it('should load manipulatives on mount', async () => {
    render(<VirtualManipulatives learnerId="learner-123" />);
    
    await waitFor(() => {
      expect(mathApi.getManipulatives).toHaveBeenCalled();
      expect(screen.getByText('Fraction Bars')).toBeInTheDocument();
      expect(screen.getByText('Number Line')).toBeInTheDocument();
      expect(screen.getByText('Base-Ten Blocks')).toBeInTheDocument();
    });
  });

  it('should switch between manipulatives', async () => {
    render(<VirtualManipulatives learnerId="learner-123" />);
    
    await waitFor(() => {
      const numberLineButton = screen.getByText('Number Line');
      fireEvent.click(numberLineButton);
    });

    expect(screen.getByText('Marker Value:')).toBeInTheDocument();
  });

  it('should save manipulative state', async () => {
    render(<VirtualManipulatives learnerId="learner-123" />);
    
    await waitFor(() => {
      const saveButton = screen.getByText(/save progress/i);
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mathApi.saveManipulativeState).toHaveBeenCalledWith(
        expect.objectContaining({
          manipulativeId: 'manip-1',
        })
      );
    });
  });
});
