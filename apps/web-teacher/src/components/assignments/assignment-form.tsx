/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-non-null-assertion */
/**
 * Assignment Form Component
 *
 * Create/edit assignment with validation
 */

'use client';

import * as React from 'react';

import { DatePicker } from '@/components/shared/date-picker';
import { FileUpload } from '@/components/shared/file-upload';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import type { CreateAssignmentDto, Assignment } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AssignmentFormProps {
  initialData?: Partial<Assignment>;
  classId: string;
  onSubmit: (data: CreateAssignmentDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  className?: string;
}

const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'test', label: 'Test' },
  { value: 'project', label: 'Project' },
  { value: 'essay', label: 'Essay' },
  { value: 'lab', label: 'Lab' },
  { value: 'participation', label: 'Participation' },
  { value: 'extra_credit', label: 'Extra Credit' },
];

const CATEGORIES = [
  'Homework',
  'Quizzes',
  'Tests',
  'Projects',
  'Participation',
  'Labs',
  'Essays',
  'Extra Credit',
];

export function AssignmentForm({
  initialData,
  classId,
  onSubmit,
  onCancel,
  loading = false,
  className,
}: AssignmentFormProps) {
  const [formData, setFormData] = React.useState({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    type: initialData?.type ?? 'homework',
    category: initialData?.category ?? 'Homework',
    totalPoints: initialData?.totalPoints ?? 100,
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : null,
    availableDate: initialData?.availableDate ? new Date(initialData.availableDate) : new Date(),
    allowLateSubmission: initialData?.allowLateSubmission ?? true,
    latePenaltyPercent: initialData?.latePenaltyPercent ?? 10,
  });

  const [attachments, setAttachments] = React.useState<
    { name: string; url: string; type: string }[]
  >([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.totalPoints <= 0) {
      newErrors.totalPoints = 'Points must be greater than 0';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      classId,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      category: formData.category,
      totalPoints: formData.totalPoints,
      dueDate: formData.dueDate!.toISOString(),
      availableDate: formData.availableDate?.toISOString(),
      allowLateSubmission: formData.allowLateSubmission,
      latePenaltyPercent: formData.latePenaltyPercent,
      attachments: attachments.map((a) => ({ name: a.name, url: a.url, type: a.type })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, title: e.target.value }));
          }}
          className={cn(
            'mt-1 w-full rounded-lg border px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
            errors.title && 'border-red-500'
          )}
          placeholder="Assignment title"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      {/* Type and Category */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={formData.type}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, type: e.target.value }));
            }}
            className="mt-1 w-full rounded-lg border px-4 py-2 focus:border-primary-500 focus:outline-none"
          >
            {ASSIGNMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={formData.category}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, category: e.target.value }));
            }}
            className="mt-1 w-full rounded-lg border px-4 py-2 focus:border-primary-500 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Points and Dates */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Total Points <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.totalPoints}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, totalPoints: parseInt(e.target.value) || 0 }));
            }}
            min={1}
            className={cn(
              'mt-1 w-full rounded-lg border px-4 py-2',
              errors.totalPoints && 'border-red-500'
            )}
          />
          {errors.totalPoints && <p className="mt-1 text-sm text-red-600">{errors.totalPoints}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Available Date</label>
          <DatePicker
            value={formData.availableDate}
            onChange={(date) => {
              setFormData((prev) => ({ ...prev, availableDate: date }));
            }}
            showTime
            className="mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Due Date <span className="text-red-500">*</span>
          </label>
          <DatePicker
            value={formData.dueDate}
            onChange={(date) => {
              setFormData((prev) => ({ ...prev, dueDate: date }));
            }}
            showTime
            minDate={formData.availableDate || undefined}
            className="mt-1"
            error={errors.dueDate}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Instructions</label>
        <RichTextEditor
          value={formData.description}
          onChange={(value) => {
            setFormData((prev) => ({ ...prev, description: value }));
          }}
          placeholder="Enter assignment instructions..."
          className="mt-1"
        />
      </div>

      {/* Late Submission */}
      <div className="rounded-lg border p-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.allowLateSubmission}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, allowLateSubmission: e.target.checked }));
            }}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">Allow late submissions</span>
        </label>
        {formData.allowLateSubmission && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-600">Late penalty:</span>
            <input
              type="number"
              value={formData.latePenaltyPercent}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  latePenaltyPercent: parseInt(e.target.value) || 0,
                }));
              }}
              min={0}
              max={100}
              className="w-20 rounded border px-2 py-1 text-center"
            />
            <span className="text-sm text-gray-600">% per day</span>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Attachments</label>
        <FileUpload
          files={attachments}
          onChange={setAttachments}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.png,.gif"
          maxFiles={5}
          className="mt-1"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : initialData ? 'Update Assignment' : 'Create Assignment'}
        </button>
      </div>
    </form>
  );
}
