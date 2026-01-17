import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WritingTemplates } from '../app/(learning)/writing-tools/components/WritingTemplates';
import * as writingApi from '../lib/writing-api';

vi.mock('../lib/writing-api');

describe('WritingTemplates', () => {
  const mockLearnerId = 'learner-123';

  const mockTemplates = [
    {
      id: 'template-1',
      type: 'essay',
      name: 'Five Paragraph Essay',
      description: 'Classic essay structure',
      gradeLevel: '6-8',
      sections: [],
    },
    {
      id: 'template-2',
      type: 'story',
      name: 'Short Story',
      description: 'Creative narrative writing',
      gradeLevel: '4-6',
      sections: [],
    },
  ];

  const mockTemplateDetails = {
    id: 'template-1',
    type: 'essay',
    name: 'Five Paragraph Essay',
    description: 'Classic essay structure',
    gradeLevel: '6-8',
    sections: [
      {
        id: 'intro',
        title: 'Introduction',
        prompt: 'Hook your reader and state your thesis',
        placeholder: 'Start with an interesting fact or question...',
        minWords: 50,
      },
      {
        id: 'body1',
        title: 'Body Paragraph 1',
        prompt: 'Present your first main point',
        minWords: 75,
      },
    ],
  };

  const mockProjects = [
    {
      id: 'project-1',
      learnerId: mockLearnerId,
      templateId: 'template-1',
      title: 'My Essay About Climate',
      sections: [
        {
          id: 'intro',
          title: 'Introduction',
          content: 'Climate change is a pressing issue...',
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      lastModified: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writingApi.getWritingTemplates).mockResolvedValue(mockTemplates);
    vi.mocked(writingApi.getWritingProjects).mockResolvedValue(mockProjects);
    vi.mocked(writingApi.getTemplate).mockResolvedValue(mockTemplateDetails);
  });

  it('loads and displays available templates', async () => {
    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Five Paragraph Essay')).toBeInTheDocument();
      expect(screen.getByText('Short Story')).toBeInTheDocument();
    });

    expect(writingApi.getWritingTemplates).toHaveBeenCalledTimes(1);
    expect(writingApi.getWritingProjects).toHaveBeenCalledWith(mockLearnerId);
  });

  it('filters templates by type', async () => {
    vi.mocked(writingApi.getTemplatesByType).mockResolvedValue([mockTemplates[0]]);

    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Five Paragraph Essay')).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'essay' } });

    await waitFor(() => {
      expect(writingApi.getTemplatesByType).toHaveBeenCalledWith('essay');
    });
  });

  it('displays user projects', async () => {
    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText(/My Projects/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/My Projects/));

    await waitFor(() => {
      expect(screen.getByText('My Essay About Climate')).toBeInTheDocument();
    });
  });

  it('opens template in editor and creates new project', async () => {
    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Five Paragraph Essay')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Five Paragraph Essay'));

    await waitFor(() => {
      expect(writingApi.getTemplate).toHaveBeenCalledWith('template-1');
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Body Paragraph 1')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter project title...')).toBeInTheDocument();
    });
  });

  it('allows editing project title and sections', async () => {
    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Five Paragraph Essay')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Five Paragraph Essay'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter project title...')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('Enter project title...');
    fireEvent.change(titleInput, { target: { value: 'My New Essay' } });

    expect(titleInput).toHaveValue('My New Essay');

    const sectionTextarea = screen.getByPlaceholderText(
      'Start with an interesting fact or question...'
    );
    fireEvent.change(sectionTextarea, {
      target: { value: 'Did you know that...' },
    });

    expect(sectionTextarea).toHaveValue('Did you know that...');
  });

  it('saves new project', async () => {
    const mockNewProject = {
      id: 'project-2',
      learnerId: mockLearnerId,
      templateId: 'template-1',
      title: 'My New Essay',
      sections: mockTemplateDetails.sections.map((s) => ({ ...s, content: '' })),
      createdAt: '2024-01-03T00:00:00Z',
      lastModified: '2024-01-03T00:00:00Z',
    };

    vi.mocked(writingApi.createWritingProject).mockResolvedValue(mockNewProject);

    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Five Paragraph Essay')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Five Paragraph Essay'));

    await waitFor(() => {
      expect(screen.getByText('Save Project')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('Enter project title...');
    fireEvent.change(titleInput, { target: { value: 'My New Essay' } });

    fireEvent.click(screen.getByText('Save Project'));

    await waitFor(() => {
      expect(writingApi.createWritingProject).toHaveBeenCalledWith(
        mockLearnerId,
        expect.objectContaining({
          templateId: 'template-1',
          title: 'My New Essay',
        })
      );
    });
  });

  it('loads existing project for editing', async () => {
    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText(/My Projects/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/My Projects/));

    await waitFor(() => {
      expect(screen.getByText('My Essay About Climate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(writingApi.getTemplate).toHaveBeenCalledWith('template-1');
      expect(screen.getByDisplayValue('My Essay About Climate')).toBeInTheDocument();
    });
  });

  it('deletes project with confirmation', async () => {
    global.confirm = vi.fn(() => true);
    vi.mocked(writingApi.deleteWritingProject).mockResolvedValue();

    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText(/My Projects/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/My Projects/));

    await waitFor(() => {
      expect(screen.getByText('My Essay About Climate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this project?');
      expect(writingApi.deleteWritingProject).toHaveBeenCalledWith(mockLearnerId, 'project-1');
    });
  });

  it('exports project as PDF', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    vi.mocked(writingApi.exportProject).mockResolvedValue(mockBlob);

    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText(/My Projects/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/My Projects/));

    await waitFor(() => {
      expect(screen.getByText('My Essay About Climate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByText('Export as PDF')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export as PDF'));

    await waitFor(() => {
      expect(writingApi.exportProject).toHaveBeenCalledWith(
        mockLearnerId,
        'project-1',
        'pdf'
      );
    });
  });

  it('displays word count for sections', async () => {
    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Five Paragraph Essay')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Five Paragraph Essay'));

    await waitFor(() => {
      expect(screen.getByText(/0 \/ 50 words minimum/)).toBeInTheDocument();
      expect(screen.getByText(/0 \/ 75 words minimum/)).toBeInTheDocument();
    });
  });

  it('disables save button when title is empty', async () => {
    render(<WritingTemplates learnerId={mockLearnerId} />);

    await waitFor(() => {
      expect(screen.getByText('Five Paragraph Essay')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Five Paragraph Essay'));

    await waitFor(() => {
      const saveButton = screen.getByText('Save Project');
      expect(saveButton).toBeDisabled();
    });
  });
});
