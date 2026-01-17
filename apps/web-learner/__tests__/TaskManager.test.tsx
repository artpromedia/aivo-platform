import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskManager } from '../app/(learning)/executive-function/components/TaskManager';
import * as execFuncApi from '../lib/executive-function-api';

vi.mock('../lib/executive-function-api');

describe('TaskManager', () => {
  const mockTasks = [
    {
      id: 'task-1',
      learnerId: 'learner-1',
      title: 'Complete math homework',
      description: 'Finish chapter 5 problems',
      dueDate: '2026-01-20',
      priority: 'high' as const,
      status: 'todo' as const,
      subtasks: [],
      tags: ['homework', 'math'],
      createdAt: '2026-01-16',
    },
    {
      id: 'task-2',
      learnerId: 'learner-1',
      title: 'Read science chapter',
      priority: 'medium' as const,
      status: 'in-progress' as const,
      subtasks: [
        { id: 'sub-1', title: 'Read section 1', completed: true, order: 0 },
        { id: 'sub-2', title: 'Take notes', completed: false, order: 1 },
      ],
      tags: ['reading'],
      createdAt: '2026-01-15',
    },
  ];

  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display task statistics', () => {
    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
  });

  it('should display all tasks', () => {
    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Complete math homework')).toBeInTheDocument();
    expect(screen.getByText('Read science chapter')).toBeInTheDocument();
  });

  it('should filter tasks by status', () => {
    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    const todoButton = screen.getByRole('button', { name: 'To Do' });
    fireEvent.click(todoButton);

    expect(screen.getByText('Complete math homework')).toBeInTheDocument();
    expect(screen.queryByText('Read science chapter')).not.toBeInTheDocument();
  });

  it('should show priority badges', () => {
    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('should display subtasks', () => {
    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('Read section 1')).toBeInTheDocument();
    expect(screen.getByText('Take notes')).toBeInTheDocument();
  });

  it('should open create task form', () => {
    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    const createButton = screen.getAllByText('+ New Task')[0];
    fireEvent.click(createButton);

    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  it('should create a new task', async () => {
    vi.mocked(execFuncApi.createTask).mockResolvedValue({
      id: 'task-3',
      learnerId: 'learner-1',
      title: 'New task',
      priority: 'medium',
      status: 'todo',
      subtasks: [],
      tags: [],
      createdAt: '2026-01-16',
    });

    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    const createButton = screen.getAllByText('+ New Task')[0];
    fireEvent.click(createButton);

    const titleInput = screen.getByPlaceholderText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'New task' } });

    const submitButton = screen.getByRole('button', { name: 'Create' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(execFuncApi.createTask).toHaveBeenCalledWith('learner-1', expect.objectContaining({
        title: 'New task',
      }));
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should show breakdown button for tasks without subtasks', () => {
    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    const breakdownButtons = screen.getAllByText(/Breakdown/);
    expect(breakdownButtons.length).toBeGreaterThan(0);
  });

  it('should open breakdown modal', () => {
    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    const breakdownButton = screen.getAllByText(/Breakdown/)[0];
    fireEvent.click(breakdownButton);

    expect(screen.getByText('Break Down Task')).toBeInTheDocument();
  });

  it('should toggle task completion', async () => {
    vi.mocked(execFuncApi.updateTask).mockResolvedValue(mockTasks[0]);

    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    const checkboxes = screen.getAllByRole('checkbox');
    const taskCheckbox = checkboxes[0];
    
    fireEvent.click(taskCheckbox);

    await waitFor(() => {
      expect(execFuncApi.updateTask).toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should delete task', async () => {
    global.confirm = vi.fn(() => true);
    vi.mocked(execFuncApi.deleteTask).mockResolvedValue();

    render(<TaskManager learnerId="learner-1" tasks={mockTasks} onUpdate={mockOnUpdate} />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(execFuncApi.deleteTask).toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should show empty state when no tasks', () => {
    render(<TaskManager learnerId="learner-1" tasks={[]} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first task to get started!')).toBeInTheDocument();
  });
});
