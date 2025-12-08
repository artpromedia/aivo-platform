'use client';

import { Card, Badge, Heading, Button } from '@aivo/ui-web';
import { useState, useCallback } from 'react';

import {
  createGoal,
  createObjective,
  updateGoal,
  updateObjective,
  type Goal,
  type GoalDomain,
  type GoalStatus,
  type GoalObjective,
  type CreateGoalInput,
  type ObjectiveStatus,
} from '../../../../../lib/teacher-planning-api';
import { cn } from '@/lib/cn';

import { useLearnerProfile } from './context';

/**
 * Goals Tab
 *
 * Displays:
 * - List of goals with expand/collapse objectives
 * - Add Goal button with modal form
 * - Edit and Add Objective actions per goal
 */
export function GoalsTab() {
  const { learner, goals, refetchGoals } = useLearnerProfile();
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [addingObjectiveForGoal, setAddingObjectiveForGoal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleExpanded = useCallback((goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  }, []);

  const handleAddGoal = useCallback(
    async (input: CreateGoalInput) => {
      setIsLoading(true);
      try {
        await createGoal(learner.id, input);
        await refetchGoals();
        setShowAddGoalModal(false);
      } catch (error) {
        console.error('Failed to create goal:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [learner.id, refetchGoals]
  );

  const handleEditGoal = useCallback(
    async (goalId: string, input: Partial<Goal>) => {
      setIsLoading(true);
      try {
        await updateGoal(goalId, input);
        await refetchGoals();
        setEditingGoal(null);
      } catch (error) {
        console.error('Failed to update goal:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [refetchGoals]
  );

  const handleAddObjective = useCallback(
    async (goalId: string, description: string, successCriteria?: string) => {
      setIsLoading(true);
      try {
        const input = successCriteria 
          ? { description, successCriteria } 
          : { description };
        await createObjective(goalId, input);
        await refetchGoals();
        setAddingObjectiveForGoal(null);
      } catch (error) {
        console.error('Failed to create objective:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [refetchGoals]
  );

  const handleUpdateObjectiveStatus = useCallback(
    async (objectiveId: string, status: ObjectiveStatus) => {
      try {
        await updateObjective(objectiveId, { status });
        await refetchGoals();
      } catch (error) {
        console.error('Failed to update objective:', error);
      }
    },
    [refetchGoals]
  );

  // Group goals by status
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const draftGoals = goals.filter((g) => g.status === 'DRAFT');
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
  const onHoldGoals = goals.filter((g) => g.status === 'ON_HOLD');

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <Heading level={2}>Goals</Heading>
        <Button variant="primary" onClick={() => setShowAddGoalModal(true)}>
          + Add Goal
        </Button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-muted mb-4">No goals have been created for this learner yet.</p>
            <Button variant="primary" onClick={() => setShowAddGoalModal(true)}>
              Create First Goal
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <GoalSection
              title="Active Goals"
              goals={activeGoals}
              expandedGoals={expandedGoals}
              onToggleExpand={toggleExpanded}
              onEdit={setEditingGoal}
              onAddObjective={setAddingObjectiveForGoal}
              onUpdateObjectiveStatus={handleUpdateObjectiveStatus}
            />
          )}

          {/* Draft Goals */}
          {draftGoals.length > 0 && (
            <GoalSection
              title="Draft Goals"
              goals={draftGoals}
              expandedGoals={expandedGoals}
              onToggleExpand={toggleExpanded}
              onEdit={setEditingGoal}
              onAddObjective={setAddingObjectiveForGoal}
              onUpdateObjectiveStatus={handleUpdateObjectiveStatus}
            />
          )}

          {/* On Hold Goals */}
          {onHoldGoals.length > 0 && (
            <GoalSection
              title="On Hold"
              goals={onHoldGoals}
              expandedGoals={expandedGoals}
              onToggleExpand={toggleExpanded}
              onEdit={setEditingGoal}
              onAddObjective={setAddingObjectiveForGoal}
              onUpdateObjectiveStatus={handleUpdateObjectiveStatus}
            />
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <GoalSection
              title="Completed Goals"
              goals={completedGoals}
              expandedGoals={expandedGoals}
              onToggleExpand={toggleExpanded}
              onEdit={setEditingGoal}
              onAddObjective={setAddingObjectiveForGoal}
              onUpdateObjectiveStatus={handleUpdateObjectiveStatus}
            />
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <AddGoalModal
          onClose={() => setShowAddGoalModal(false)}
          onSubmit={handleAddGoal}
          isLoading={isLoading}
        />
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={(input) => handleEditGoal(editingGoal.id, input)}
          isLoading={isLoading}
        />
      )}

      {/* Add Objective Modal */}
      {addingObjectiveForGoal && (
        <AddObjectiveModal
          goalId={addingObjectiveForGoal}
          onClose={() => setAddingObjectiveForGoal(null)}
          onSubmit={handleAddObjective}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GOAL SECTION
// ══════════════════════════════════════════════════════════════════════════════

interface GoalSectionProps {
  title: string;
  goals: Goal[];
  expandedGoals: Set<string>;
  onToggleExpand: (goalId: string) => void;
  onEdit: (goal: Goal) => void;
  onAddObjective: (goalId: string) => void;
  onUpdateObjectiveStatus: (objectiveId: string, status: ObjectiveStatus) => void;
}

function GoalSection({
  title,
  goals,
  expandedGoals,
  onToggleExpand,
  onEdit,
  onAddObjective,
  onUpdateObjectiveStatus,
}: GoalSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-medium text-muted mb-3">
        {title} ({goals.length})
      </h3>
      <div className="flex flex-col gap-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            isExpanded={expandedGoals.has(goal.id)}
            onToggleExpand={() => onToggleExpand(goal.id)}
            onEdit={() => onEdit(goal)}
            onAddObjective={() => onAddObjective(goal.id)}
            onUpdateObjectiveStatus={onUpdateObjectiveStatus}
          />
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GOAL CARD
// ══════════════════════════════════════════════════════════════════════════════

interface GoalCardProps {
  goal: Goal;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onAddObjective: () => void;
  onUpdateObjectiveStatus: (objectiveId: string, status: ObjectiveStatus) => void;
}

function GoalCard({
  goal,
  isExpanded,
  onToggleExpand,
  onEdit,
  onAddObjective,
  onUpdateObjectiveStatus,
}: GoalCardProps) {
  const objectives = goal.objectives ?? [];
  const metCount = objectives.filter((o) => o.status === 'MET').length;

  return (
    <Card>
      <div className="p-4">
        {/* Goal Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={onToggleExpand}
            className="mt-1 text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse objectives' : 'Expand objectives'}
          >
            <ChevronIcon className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium">{goal.title}</h4>
              <div className="flex items-center gap-2">
                <Badge tone={getDomainTone(goal.domain)}>
                  {goal.domain}
                </Badge>
                <Badge tone={getStatusTone(goal.status)}>
                  {formatStatus(goal.status)}
                </Badge>
              </div>
            </div>

            {goal.description && (
              <p className="text-sm text-muted mt-1 line-clamp-2">{goal.description}</p>
            )}

            <div className="flex items-center gap-4 mt-2 text-sm text-muted">
              {goal.targetDate && (
                <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
              )}
              {objectives.length > 0 && (
                <span>
                  {metCount}/{objectives.length} objectives met
                </span>
              )}
              {goal.skill && <span>Skill: {goal.skill.name}</span>}
            </div>

            {/* Progress Bar */}
            {objectives.length > 0 && (
              <div className="mt-3">
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(metCount / objectives.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Objectives (expanded) */}
        {isExpanded && (
          <div className="mt-4 ml-7 border-l-2 border-border pl-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium">Objectives</h5>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onAddObjective}>
                  + Add Objective
                </Button>
                <Button variant="ghost" onClick={onEdit}>
                  Edit Goal
                </Button>
              </div>
            </div>

            {objectives.length === 0 ? (
              <p className="text-sm text-muted">No objectives defined yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {objectives.map((obj) => (
                  <ObjectiveItem
                    key={obj.id}
                    objective={obj}
                    onUpdateStatus={onUpdateObjectiveStatus}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE ITEM
// ══════════════════════════════════════════════════════════════════════════════

interface ObjectiveItemProps {
  objective: GoalObjective;
  onUpdateStatus: (objectiveId: string, status: ObjectiveStatus) => void;
}

function ObjectiveItem({ objective, onUpdateStatus }: ObjectiveItemProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <li className="flex items-start gap-3 p-2 rounded-md hover:bg-surface">
      <div className="relative">
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            objective.status === 'MET' && 'bg-green-500 border-green-500 text-white',
            objective.status === 'NOT_MET' && 'bg-red-500 border-red-500 text-white',
            objective.status === 'IN_PROGRESS' && 'border-yellow-500',
            objective.status === 'NOT_STARTED' && 'border-border'
          )}
          aria-label={`Status: ${objective.status}. Click to change.`}
        >
          {objective.status === 'MET' && <CheckIcon className="w-3 h-3" />}
          {objective.status === 'NOT_MET' && <XIcon className="w-3 h-3" />}
        </button>

        {/* Status Dropdown */}
        {showStatusMenu && (
          <div className="absolute top-6 left-0 z-10 bg-background border border-border rounded-md shadow-lg py-1 min-w-[140px]">
            {(['NOT_STARTED', 'IN_PROGRESS', 'MET', 'NOT_MET'] as ObjectiveStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  onUpdateStatus(objective.id, s);
                  setShowStatusMenu(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm hover:bg-surface',
                  objective.status === s && 'font-medium bg-surface'
                )}
              >
                {formatObjectiveStatus(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', objective.status === 'MET' && 'line-through text-muted')}>
          {objective.description}
        </p>
        {objective.successCriteria && (
          <p className="text-xs text-muted mt-0.5">Criteria: {objective.successCriteria}</p>
        )}
      </div>

      <Badge tone={getObjectiveStatusTone(objective.status)}>
        {formatObjectiveStatus(objective.status)}
      </Badge>
    </li>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADD GOAL MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface AddGoalModalProps {
  onClose: () => void;
  onSubmit: (input: CreateGoalInput) => void;
  isLoading: boolean;
}

function AddGoalModal({ onClose, onSubmit, isLoading }: AddGoalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState<GoalDomain>('ELA');
  const [targetDate, setTargetDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const input: CreateGoalInput = {
      title: title.trim(),
      domain,
    };
    if (description.trim()) {
      input.description = description.trim();
    }
    if (targetDate) {
      input.targetDate = targetDate;
    }
    onSubmit(input);
  };

  return (
    <Modal title="Add New Goal" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="goal-title" className="block text-sm font-medium mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="goal-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Improve reading fluency"
            required
          />
        </div>

        <div>
          <label htmlFor="goal-description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="goal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            placeholder="Describe the goal in detail..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="goal-domain" className="block text-sm font-medium mb-1">
              Domain <span className="text-red-500">*</span>
            </label>
            <select
              id="goal-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value as GoalDomain)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ELA">ELA</option>
              <option value="MATH">Math</option>
              <option value="SCIENCE">Science</option>
              <option value="SPEECH">Speech</option>
              <option value="SEL">SEL</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="goal-target-date" className="block text-sm font-medium mb-1">
              Target Date
            </label>
            <input
              id="goal-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !title.trim()}>
            {isLoading ? 'Creating...' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EDIT GOAL MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface EditGoalModalProps {
  goal: Goal;
  onClose: () => void;
  onSubmit: (input: Partial<Goal>) => void;
  isLoading: boolean;
}

function EditGoalModal({ goal, onClose, onSubmit, isLoading }: EditGoalModalProps) {
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? '');
  const [status, setStatus] = useState<GoalStatus>(goal.status);
  const [targetDate, setTargetDate] = useState(
    goal.targetDate ? goal.targetDate.split('T')[0] : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      status,
      targetDate: targetDate || null,
    });
  };

  return (
    <Modal title="Edit Goal" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="edit-goal-title" className="block text-sm font-medium mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-goal-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label htmlFor="edit-goal-description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="edit-goal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-goal-status" className="block text-sm font-medium mb-1">
              Status
            </label>
            <select
              id="edit-goal-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as GoalStatus)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-goal-target-date" className="block text-sm font-medium mb-1">
              Target Date
            </label>
            <input
              id="edit-goal-target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !title.trim()}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADD OBJECTIVE MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface AddObjectiveModalProps {
  goalId: string;
  onClose: () => void;
  onSubmit: (goalId: string, description: string, successCriteria?: string) => void;
  isLoading: boolean;
}

function AddObjectiveModal({ goalId, onClose, onSubmit, isLoading }: AddObjectiveModalProps) {
  const [description, setDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    onSubmit(goalId, description.trim(), successCriteria.trim() || undefined);
  };

  return (
    <Modal title="Add Objective" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="obj-description" className="block text-sm font-medium mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="obj-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
            placeholder="e.g., Read 50 WPM with less than 3 errors"
            required
          />
        </div>

        <div>
          <label htmlFor="obj-criteria" className="block text-sm font-medium mb-1">
            Success Criteria
          </label>
          <input
            id="obj-criteria"
            type="text"
            value={successCriteria}
            onChange={(e) => setSuccessCriteria(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., 3 consecutive sessions meeting criteria"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !description.trim()}>
            {isLoading ? 'Adding...' : 'Add Objective'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 id="modal-title" className="text-lg font-semibold">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label="Close modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getDomainTone(domain: GoalDomain): 'info' | 'success' | 'warning' | 'error' {
  switch (domain) {
    case 'ELA':
      return 'info';
    case 'MATH':
      return 'success';
    case 'SCIENCE':
      return 'warning';
    case 'SPEECH':
    case 'SEL':
      return 'info';
    default:
      return 'info';
  }
}

function getStatusTone(status: GoalStatus): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'COMPLETED':
      return 'info';
    case 'ON_HOLD':
      return 'warning';
    case 'DRAFT':
      return 'info';
    case 'ARCHIVED':
      return 'info';
    default:
      return 'info';
  }
}

function formatStatus(status: GoalStatus): string {
  switch (status) {
    case 'ON_HOLD':
      return 'On Hold';
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

function getObjectiveStatusTone(status: ObjectiveStatus): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'MET':
      return 'success';
    case 'NOT_MET':
      return 'error';
    case 'IN_PROGRESS':
      return 'warning';
    case 'NOT_STARTED':
    default:
      return 'info';
  }
}

function formatObjectiveStatus(status: ObjectiveStatus): string {
  switch (status) {
    case 'NOT_STARTED':
      return 'Not Started';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'NOT_MET':
      return 'Not Met';
    case 'MET':
      return 'Met';
    default:
      return status;
  }
}
