import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MindMapping } from '../components/MindMapping';
import * as api from '@/lib/visual-learning-api';

jest.mock('@/lib/visual-learning-api');

describe('MindMapping', () => {
  const mockMindMaps = [
    {
      id: '1',
      userId: 'user123',
      title: 'Test Map',
      description: 'Test description',
      nodes: [
        {
          id: 'node1',
          label: 'Root Node',
          color: '#60a5fa',
          x: 400,
          y: 300,
          parentId: null,
        },
      ],
      connections: [],
      theme: 'colorful' as const,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      isPublic: false,
      tags: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (api.getMindMaps as jest.Mock).mockResolvedValue(mockMindMaps);
  });

  it('renders mind mapping interface', async () => {
    render(<MindMapping />);
    
    await waitFor(() => {
      expect(screen.getByText('My Mind Maps')).toBeInTheDocument();
    });
  });

  it('loads and displays mind maps', async () => {
    render(<MindMapping />);

    await waitFor(() => {
      expect(screen.getByText('Test Map')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('1 nodes')).toBeInTheDocument();
    });

    expect(api.getMindMaps).toHaveBeenCalledWith('user123');
  });

  it('creates new mind map', async () => {
    const newMap = { ...mockMindMaps[0], id: '2', title: 'New Map' };
    (api.createMindMap as jest.Mock).mockResolvedValue(newMap);

    render(<MindMapping />);

    await waitFor(() => {
      expect(screen.getByText('Test Map')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Map'));

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'New Map' } });

    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'New description' } });

    fireEvent.click(screen.getByText('Create Map'));

    await waitFor(() => {
      expect(api.createMindMap).toHaveBeenCalledWith({
        userId: 'user123',
        title: 'New Map',
        description: 'New description',
        theme: 'colorful',
      });
    });
  });

  it('deletes mind map', async () => {
    (api.deleteMindMap as jest.Mock).mockResolvedValue(undefined);
    global.confirm = jest.fn(() => true);

    render(<MindMapping />);

    await waitFor(() => {
      expect(screen.getByText('Test Map')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(api.deleteMindMap).toHaveBeenCalledWith('1');
    });
  });

  it('exports mind map', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });
    (api.getMindMap as jest.Mock).mockResolvedValue(mockMindMaps[0]);
    (api.exportMindMap as jest.Mock).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and link click
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    const mockClick = jest.fn();
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return { click: mockClick } as any;
      }
      return document.createElement(tag);
    });

    render(<MindMapping />);

    await waitFor(() => {
      expect(screen.getByText('Test Map')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Map'));

    await waitFor(() => {
      expect(screen.getByText('Export PNG')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export PNG'));

    await waitFor(() => {
      expect(api.exportMindMap).toHaveBeenCalledWith('1', 'png');
      expect(mockClick).toHaveBeenCalled();
    });
  });
});
