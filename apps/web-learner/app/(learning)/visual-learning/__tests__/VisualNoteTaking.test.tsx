import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisualNoteTaking } from '../components/VisualNoteTaking';
import * as api from '@/lib/visual-learning-api';

jest.mock('@/lib/visual-learning-api');

describe('VisualNoteTaking', () => {
  const mockNotebooks = [
    {
      id: '1',
      userId: 'user123',
      title: 'Science Notes',
      description: 'Biology study notes',
      subject: 'Biology',
      notes: [
        {
          id: 'note1',
          type: 'sketch' as const,
          content: '',
          position: 0,
        },
        {
          id: 'note2',
          type: 'mixed' as const,
          content: 'Mixed content',
          position: 1,
        },
      ],
      backgroundColor: '#ffffff',
      gridType: 'dots' as const,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      tags: ['biology', 'cells'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (api.getVisualNotebooks as jest.Mock).mockResolvedValue(mockNotebooks);
  });

  it('renders visual note-taking interface', async () => {
    render(<VisualNoteTaking />);

    await waitFor(() => {
      expect(screen.getByText('My Notebooks')).toBeInTheDocument();
    });
  });

  it('loads and displays notebooks', async () => {
    render(<VisualNoteTaking />);

    await waitFor(() => {
      expect(screen.getByText('Science Notes')).toBeInTheDocument();
      expect(screen.getByText('Biology')).toBeInTheDocument();
      expect(screen.getByText('2 notes')).toBeInTheDocument();
    });

    expect(api.getVisualNotebooks).toHaveBeenCalledWith('user123');
  });

  it('creates new notebook', async () => {
    const newNotebook = { ...mockNotebooks[0], id: '2', title: 'Math Notes', notes: [] };
    (api.createVisualNotebook as jest.Mock).mockResolvedValue(newNotebook);

    render(<VisualNoteTaking />);

    await waitFor(() => {
      expect(screen.getByText('Science Notes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New'));

    const titleInput = screen.getByLabelText('Title');
    fireEvent.change(titleInput, { target: { value: 'Math Notes' } });

    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'Algebra notes' } });

    const subjectInput = screen.getByLabelText('Subject (optional)');
    fireEvent.change(subjectInput, { target: { value: 'Math' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.createVisualNotebook).toHaveBeenCalledWith({
        userId: 'user123',
        title: 'Math Notes',
        description: 'Algebra notes',
        subject: 'Math',
      });
    });
  });

  it('adds note to notebook', async () => {
    const updatedNotebook = {
      ...mockNotebooks[0],
      notes: [
        ...mockNotebooks[0].notes,
        { id: 'note3', type: 'table' as const, content: '', position: 2 },
      ],
    };
    (api.getVisualNotebook as jest.Mock).mockResolvedValue(mockNotebooks[0]);
    (api.addVisualNote as jest.Mock).mockResolvedValue(updatedNotebook);

    render(<VisualNoteTaking />);

    await waitFor(() => {
      expect(screen.getByText('Science Notes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Science Notes'));

    await waitFor(() => {
      expect(screen.getByText('table')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('table'));

    await waitFor(() => {
      expect(api.addVisualNote).toHaveBeenCalledWith('1', {
        type: 'table',
        content: '',
        position: 2,
      });
    });
  });

  it('updates grid type', async () => {
    const updatedNotebook = { ...mockNotebooks[0], gridType: 'lines' as const };
    (api.getVisualNotebook as jest.Mock).mockResolvedValue(mockNotebooks[0]);
    (api.updateVisualNotebook as jest.Mock).mockResolvedValue(updatedNotebook);

    render(<VisualNoteTaking />);

    await waitFor(() => {
      expect(screen.getByText('Science Notes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Science Notes'));

    await waitFor(() => {
      expect(screen.getByText('lines')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('lines'));

    await waitFor(() => {
      expect(api.updateVisualNotebook).toHaveBeenCalledWith('1', { gridType: 'lines' });
    });
  });

  it('exports notebook', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    (api.getVisualNotebook as jest.Mock).mockResolvedValue(mockNotebooks[0]);
    (api.exportVisualNotebook as jest.Mock).mockResolvedValue(mockBlob);

    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    const mockClick = jest.fn();
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return { click: mockClick } as any;
      }
      return document.createElement(tag);
    });

    render(<VisualNoteTaking />);

    await waitFor(() => {
      expect(screen.getByText('Science Notes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Science Notes'));

    await waitFor(() => {
      expect(screen.getByText('Export PDF')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export PDF'));

    await waitFor(() => {
      expect(api.exportVisualNotebook).toHaveBeenCalledWith('1', 'pdf');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('deletes note from notebook', async () => {
    const updatedNotebook = {
      ...mockNotebooks[0],
      notes: [mockNotebooks[0].notes[0]],
    };
    (api.getVisualNotebook as jest.Mock).mockResolvedValue(mockNotebooks[0]);
    (api.deleteVisualNote as jest.Mock).mockResolvedValue(updatedNotebook);
    global.confirm = jest.fn(() => true);

    render(<VisualNoteTaking />);

    await waitFor(() => {
      expect(screen.getByText('Science Notes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Science Notes'));

    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByText('Delete');
    // Click first delete button (from a note, not the notebook)
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(api.deleteVisualNote).toHaveBeenCalled();
    });
  });
});
