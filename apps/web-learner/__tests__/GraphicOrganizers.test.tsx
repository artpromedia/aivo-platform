import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GraphicOrganizers } from '../app/(learning)/writing-tools/components/GraphicOrganizers';
import * as writingApi from '../lib/writing-api';

vi.mock('../lib/writing-api');

describe('GraphicOrganizers', () => {
  const mockLearnerId = 'learner-123';

  const mockOrganizers = [
    {
      id: 'web-1',
      type: 'web' as const,
      name: 'Web Diagram',
      description: 'Connect ideas to a central topic',
    },
    {
      id: 'venn-1',
      type: 'venn' as const,
      name: 'Venn Diagram',
      description: 'Compare and contrast two subjects',
    },
    {
      id: 'sequence-1',
      type: 'sequence' as const,
      name: 'Sequence Chart',
      description: 'Order events or steps',
    },
  ];

  const mockSavedOrganizers = [
    {
      id: 'saved-1',
      learnerId: mockLearnerId,
      organizerId: 'web-1',
      content: {
        organizerId: 'web-1',
        title: 'My Saved Web',
        centerTopic: 'Plants',
        connections: ['Photosynthesis', 'Roots', 'Leaves'],
        createdAt: '2024-01-01T00:00:00Z',
      },
      lastModified: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writingApi.getGraphicOrganizers).mockResolvedValue(mockOrganizers);
    vi.mocked(writingApi.getSavedOrganizers).mockResolvedValue(mockSavedOrganizers);
  });

  it('loads and displays available graphic organizers', async () => {
    render(<GraphicOrganizers learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Web Diagram')).toBeInTheDocument();
      expect(screen.getByText('Venn Diagram')).toBeInTheDocument();
      expect(screen.getByText('Sequence Chart')).toBeInTheDocument();
    });

    expect(writingApi.getGraphicOrganizers).toHaveBeenCalledTimes(1);
  });

  it('allows selecting and editing a web diagram organizer', async () => {
    render(<GraphicOrganizers learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Web Diagram')).toBeInTheDocument();
    });

    // Select web diagram
    fireEvent.click(screen.getByText('Web Diagram'));

    await waitFor(() => {
      expect(screen.getByText('Back to Selection')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Main idea or topic')).toBeInTheDocument();
    });

    // Enter title
    const titleInput = screen.getByPlaceholderText('Give your organizer a title');
    fireEvent.change(titleInput, { target: { value: 'My Web Diagram' } });

    // Enter center topic
    const centerTopicInput = screen.getByPlaceholderText('Main idea or topic');
    fireEvent.change(centerTopicInput, { target: { value: 'Animals' } });

    expect(titleInput).toHaveValue('My Web Diagram');
    expect(centerTopicInput).toHaveValue('Animals');
  });

  it('allows adding and removing connections in web diagram', async () => {
    render(<GraphicOrganizers learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Web Diagram')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Web Diagram'));

    await waitFor(() => {
      expect(screen.getByText('Add Connection')).toBeInTheDocument();
    });

    // Add connection
    fireEvent.click(screen.getByText('Add Connection'));

    const connectionInput = screen.getByPlaceholderText('Connection 1');
    fireEvent.change(connectionInput, { target: { value: 'Mammals' } });

    expect(connectionInput).toHaveValue('Mammals');

    // Remove connection
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Connection 1')).not.toBeInTheDocument();
    });
  });

  it('saves organizer content', async () => {
    vi.mocked(writingApi.saveOrganizerContent).mockResolvedValue({
      id: 'new-saved-1',
      learnerId: mockLearnerId,
      organizerId: 'web-1',
      content: {
        organizerId: 'web-1',
        title: 'Test Title',
        centerTopic: 'Test Topic',
        connections: [],
        createdAt: expect.any(String),
      },
      lastModified: expect.any(String),
    });

    render(<GraphicOrganizers learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Web Diagram')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Web Diagram'));

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('Give your organizer a title');
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(writingApi.saveOrganizerContent).toHaveBeenCalledWith(
        mockLearnerId,
        expect.objectContaining({
          organizerId: 'web-1',
          title: 'Test Title',
        })
      );
    });
  });

  it('displays saved organizers', async () => {
    render(<GraphicOrganizers learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Show Saved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Saved'));

    await waitFor(() => {
      expect(screen.getByText('My Saved Web')).toBeInTheDocument();
      expect(screen.getByText('Web Diagram')).toBeInTheDocument();
    });
  });

  it('loads a saved organizer for editing', async () => {
    render(<GraphicOrganizers learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Show Saved')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Saved'));

    await waitFor(() => {
      expect(screen.getByText('My Saved Web')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('My Saved Web'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Saved Web')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Plants')).toBeInTheDocument();
    });
  });

  it('handles export to PDF', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    vi.mocked(writingApi.exportOrganizer).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    render(<GraphicOrganizers learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Web Diagram')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Web Diagram'));

    await waitFor(() => {
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export as PDF'));

    await waitFor(() => {
      expect(writingApi.exportOrganizer).toHaveBeenCalledWith(
        mockLearnerId,
        expect.any(Object),
        'pdf'
      );
    });
  });

  it('displays error when loading organizers fails', async () => {
    vi.mocked(writingApi.getGraphicOrganizers).mockRejectedValue(
      new Error('Network error')
    );

    render(<GraphicOrganizers learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load graphic organizers')).toBeInTheDocument();
    });
  });
});
