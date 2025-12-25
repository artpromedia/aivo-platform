/**
 * Adaptive Condition Builder Component
 * Visual builder for creating conditional display rules
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  Zap,
  Target,
  Clock,
  Hash,
  MessageSquare,
} from 'lucide-react';
import { AdaptiveCondition } from '@/lib/api/content';
import { cn } from '@/lib/utils';

interface AdaptiveConditionBuilderProps {
  conditions: AdaptiveCondition[];
  onChange: (conditions: AdaptiveCondition[]) => void;
  availableBlocks?: Array<{ id: string; label: string; type: string }>;
  availableSkills?: Array<{ id: string; name: string }>;
}

type ConditionType = AdaptiveCondition['type'];
type ConditionOperator = AdaptiveCondition['operator'];

const CONDITION_TYPES: Array<{
  type: ConditionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'mastery',
    label: 'Skill Mastery',
    description: 'Based on mastery of a specific skill',
    icon: Target,
  },
  {
    type: 'previous_answer',
    label: 'Previous Answer',
    description: 'Based on answer to a previous question',
    icon: MessageSquare,
  },
  {
    type: 'attempt_count',
    label: 'Attempt Count',
    description: 'Based on number of attempts',
    icon: Hash,
  },
  {
    type: 'time_spent',
    label: 'Time Spent',
    description: 'Based on time spent on content',
    icon: Clock,
  },
  {
    type: 'custom',
    label: 'Custom Expression',
    description: 'Advanced custom condition',
    icon: Zap,
  },
];

const OPERATORS: Record<ConditionType, Array<{ value: ConditionOperator; label: string }>> = {
  mastery: [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'equals', label: 'Equals' },
  ],
  previous_answer: [
    { value: 'equals', label: 'Is' },
    { value: 'not_equals', label: 'Is not' },
    { value: 'contains', label: 'Contains' },
  ],
  attempt_count: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
  ],
  time_spent: [
    { value: 'greater_than', label: 'More than' },
    { value: 'less_than', label: 'Less than' },
  ],
  custom: [
    { value: 'equals', label: 'Evaluates to true' },
  ],
};

export const AdaptiveConditionBuilder: React.FC<AdaptiveConditionBuilderProps> = ({
  conditions,
  onChange,
  availableBlocks = [],
  availableSkills = [],
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addCondition = (type: ConditionType) => {
    const newCondition: AdaptiveCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      operator: OPERATORS[type][0].value,
      value: getDefaultValue(type),
    };
    onChange([...conditions, newCondition]);
    setShowAddMenu(false);
  };

  const updateCondition = (id: string, updates: Partial<AdaptiveCondition>) => {
    onChange(
      conditions.map((cond) =>
        cond.id === id ? { ...cond, ...updates } : cond
      )
    );
  };

  const removeCondition = (id: string) => {
    onChange(conditions.filter((cond) => cond.id !== id));
  };

  const getDefaultValue = (type: ConditionType): any => {
    switch (type) {
      case 'mastery':
        return 0.7;
      case 'previous_answer':
        return 'correct';
      case 'attempt_count':
        return 1;
      case 'time_spent':
        return 60;
      case 'custom':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-3">
      {conditions.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg">
          <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No conditions set. This block will always show.
          </p>
          <Popover open={showAddMenu} onOpenChange={setShowAddMenu}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Condition
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-2">
                <p className="text-sm font-medium">Choose condition type</p>
                {CONDITION_TYPES.map((condType) => (
                  <button
                    key={condType.type}
                    onClick={() => addCondition(condType.type)}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-muted text-left"
                  >
                    <condType.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{condType.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {condType.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <React.Fragment key={condition.id}>
                {index > 0 && (
                  <div className="flex items-center justify-center">
                    <Badge variant="secondary" className="text-xs">AND</Badge>
                  </div>
                )}
                <ConditionCard
                  condition={condition}
                  onUpdate={(updates) => updateCondition(condition.id, updates)}
                  onRemove={() => removeCondition(condition.id)}
                  availableBlocks={availableBlocks}
                  availableSkills={availableSkills}
                />
              </React.Fragment>
            ))}
          </div>

          <Popover open={showAddMenu} onOpenChange={setShowAddMenu}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Another Condition
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-2">
                <p className="text-sm font-medium">Choose condition type</p>
                {CONDITION_TYPES.map((condType) => (
                  <button
                    key={condType.type}
                    onClick={() => addCondition(condType.type)}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-muted text-left"
                  >
                    <condType.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{condType.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {condType.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      {conditions.length > 0 && (
        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
          This block will show when <strong>all</strong> conditions are met.
        </div>
      )}
    </div>
  );
};

// Individual Condition Card
interface ConditionCardProps {
  condition: AdaptiveCondition;
  onUpdate: (updates: Partial<AdaptiveCondition>) => void;
  onRemove: () => void;
  availableBlocks: Array<{ id: string; label: string; type: string }>;
  availableSkills: Array<{ id: string; name: string }>;
}

const ConditionCard: React.FC<ConditionCardProps> = ({
  condition,
  onUpdate,
  onRemove,
  availableBlocks,
  availableSkills,
}) => {
  const conditionType = CONDITION_TYPES.find((t) => t.type === condition.type);
  const Icon = conditionType?.icon || Zap;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-muted rounded">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{conditionType?.label}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Condition-specific inputs */}
            {condition.type === 'mastery' && (
              <MasteryConditionInputs
                condition={condition}
                onUpdate={onUpdate}
                skills={availableSkills}
              />
            )}

            {condition.type === 'previous_answer' && (
              <PreviousAnswerConditionInputs
                condition={condition}
                onUpdate={onUpdate}
                blocks={availableBlocks}
              />
            )}

            {condition.type === 'attempt_count' && (
              <AttemptCountConditionInputs
                condition={condition}
                onUpdate={onUpdate}
                blocks={availableBlocks}
              />
            )}

            {condition.type === 'time_spent' && (
              <TimeSpentConditionInputs
                condition={condition}
                onUpdate={onUpdate}
              />
            )}

            {condition.type === 'custom' && (
              <CustomConditionInputs
                condition={condition}
                onUpdate={onUpdate}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mastery Condition Inputs
const MasteryConditionInputs: React.FC<{
  condition: AdaptiveCondition;
  onUpdate: (updates: Partial<AdaptiveCondition>) => void;
  skills: Array<{ id: string; name: string }>;
}> = ({ condition, onUpdate, skills }) => (
  <div className="grid grid-cols-3 gap-2">
    <Select
      value={condition.skillId || ''}
      onValueChange={(skillId) => onUpdate({ skillId })}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Select skill" />
      </SelectTrigger>
      <SelectContent>
        {skills.map((skill) => (
          <SelectItem key={skill.id} value={skill.id}>
            {skill.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select
      value={condition.operator}
      onValueChange={(operator: ConditionOperator) => onUpdate({ operator })}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPERATORS.mastery.map((op) => (
          <SelectItem key={op.value} value={op.value}>
            {op.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={100}
        step={5}
        value={Math.round((condition.value || 0) * 100)}
        onChange={(e) => onUpdate({ value: parseInt(e.target.value) / 100 })}
        className="h-8 text-xs"
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  </div>
);

// Previous Answer Condition Inputs
const PreviousAnswerConditionInputs: React.FC<{
  condition: AdaptiveCondition;
  onUpdate: (updates: Partial<AdaptiveCondition>) => void;
  blocks: Array<{ id: string; label: string; type: string }>;
}> = ({ condition, onUpdate, blocks }) => {
  const questionBlocks = blocks.filter((b) =>
    ['multiple-choice', 'true-false', 'fill-blank', 'matching', 'ordering'].includes(b.type)
  );

  return (
    <div className="space-y-2">
      <Select
        value={condition.targetBlockId || ''}
        onValueChange={(targetBlockId) => onUpdate({ targetBlockId })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select question block" />
        </SelectTrigger>
        <SelectContent>
          {questionBlocks.map((block) => (
            <SelectItem key={block.id} value={block.id}>
              {block.label || `${block.type} block`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={condition.operator}
          onValueChange={(operator: ConditionOperator) => onUpdate({ operator })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.previous_answer.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={condition.value || 'correct'}
          onValueChange={(value) => onUpdate({ value })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="correct">Correct</SelectItem>
            <SelectItem value="incorrect">Incorrect</SelectItem>
            <SelectItem value="partial">Partially Correct</SelectItem>
            <SelectItem value="unanswered">Unanswered</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// Attempt Count Condition Inputs
const AttemptCountConditionInputs: React.FC<{
  condition: AdaptiveCondition;
  onUpdate: (updates: Partial<AdaptiveCondition>) => void;
  blocks: Array<{ id: string; label: string; type: string }>;
}> = ({ condition, onUpdate, blocks }) => {
  const questionBlocks = blocks.filter((b) =>
    ['multiple-choice', 'true-false', 'fill-blank', 'matching', 'ordering'].includes(b.type)
  );

  return (
    <div className="space-y-2">
      <Select
        value={condition.targetBlockId || ''}
        onValueChange={(targetBlockId) => onUpdate({ targetBlockId })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select question block" />
        </SelectTrigger>
        <SelectContent>
          {questionBlocks.map((block) => (
            <SelectItem key={block.id} value={block.id}>
              {block.label || `${block.type} block`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={condition.operator}
          onValueChange={(operator: ConditionOperator) => onUpdate({ operator })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.attempt_count.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          min={1}
          max={10}
          value={condition.value || 1}
          onChange={(e) => onUpdate({ value: parseInt(e.target.value) })}
          className="h-8 text-xs"
          placeholder="Number of attempts"
        />
      </div>
    </div>
  );
};

// Time Spent Condition Inputs
const TimeSpentConditionInputs: React.FC<{
  condition: AdaptiveCondition;
  onUpdate: (updates: Partial<AdaptiveCondition>) => void;
}> = ({ condition, onUpdate }) => (
  <div className="grid grid-cols-2 gap-2">
    <Select
      value={condition.operator}
      onValueChange={(operator: ConditionOperator) => onUpdate({ operator })}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPERATORS.time_spent.map((op) => (
          <SelectItem key={op.value} value={op.value}>
            {op.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        value={condition.value || 60}
        onChange={(e) => onUpdate({ value: parseInt(e.target.value) })}
        className="h-8 text-xs"
      />
      <span className="text-xs text-muted-foreground">seconds</span>
    </div>
  </div>
);

// Custom Condition Inputs
const CustomConditionInputs: React.FC<{
  condition: AdaptiveCondition;
  onUpdate: (updates: Partial<AdaptiveCondition>) => void;
}> = ({ condition, onUpdate }) => (
  <div className="space-y-2">
    <Input
      value={condition.value || ''}
      onChange={(e) => onUpdate({ value: e.target.value })}
      className="h-8 text-xs font-mono"
      placeholder="e.g., learner.score > 80 && learner.attempts < 3"
    />
    <p className="text-xs text-muted-foreground">
      Available variables: <code>learner</code>, <code>session</code>, <code>block</code>
    </p>
  </div>
);
