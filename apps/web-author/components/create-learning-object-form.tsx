'use client';

import { Button, Card } from '@aivo/ui-web';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import { createLearningObject, listSkills } from '../lib/authoring-api';
import { cn } from '../lib/cn';
import { useToast } from '../lib/toast';
import {
  SUBJECT_LABELS,
  GRADE_BAND_LABELS,
  type Subject,
  type GradeBand,
  type Skill,
} from '../lib/types';

const SUBJECTS: Subject[] = ['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER'];
const GRADE_BANDS: GradeBand[] = ['K_2', 'G3_5', 'G6_8', 'G9_12'];

interface FormData {
  title: string;
  subject: Subject | '';
  gradeBand: GradeBand | '';
  primarySkillId: string;
  tags: string[];
}

export function CreateLearningObjectForm() {
  const router = useRouter();
  const { addToast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    subject: '',
    gradeBand: '',
    primarySkillId: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch skills based on selected subject/grade
  useEffect(() => {
    const fetchSkills = async () => {
      const results = await listSkills({
        subject: formData.subject || undefined,
        gradeBand: formData.gradeBand || undefined,
      });
      setSkills(results);
    };
    void fetchSkills();
  }, [formData.subject, formData.gradeBand]);

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
      skill.description?.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const selectedSkill = skills.find((s) => s.id === formData.primarySkillId);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.gradeBand) newErrors.gradeBand = 'Grade band is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await createLearningObject({
        title: formData.title,
        subject: formData.subject as Subject,
        gradeBand: formData.gradeBand as GradeBand,
        primarySkillId: formData.primarySkillId || null,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      });
      addToast('success', 'Learning object created successfully');
      router.push(`/learning-objects/${result.learningObject.id}/versions/1`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create learning object');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Create Learning Object</h1>
        <p className="mt-1 text-sm text-muted">
          Create a new learning object with an initial draft version.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-text">
              Title <span className="text-error">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, title: e.target.value }));
              }}
              className={cn(
                'mt-1 block w-full rounded-lg border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
                errors.title ? 'border-error' : 'border-border'
              )}
              placeholder="e.g., Reading Comprehension: Main Idea"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && (
              <p id="title-error" className="mt-1 text-sm text-error">
                {errors.title}
              </p>
            )}
          </div>

          {/* Subject & Grade Band */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-text">
                Subject <span className="text-error">*</span>
              </label>
              <select
                id="subject"
                value={formData.subject}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    subject: e.target.value as Subject,
                    primarySkillId: '',
                  }));
                }}
                className={cn(
                  'mt-1 block w-full rounded-lg border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50',
                  errors.subject ? 'border-error' : 'border-border'
                )}
                aria-invalid={!!errors.subject}
              >
                <option value="">Select subject</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {SUBJECT_LABELS[s]}
                  </option>
                ))}
              </select>
              {errors.subject && <p className="mt-1 text-sm text-error">{errors.subject}</p>}
            </div>

            <div>
              <label htmlFor="gradeBand" className="block text-sm font-medium text-text">
                Grade Band <span className="text-error">*</span>
              </label>
              <select
                id="gradeBand"
                value={formData.gradeBand}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    gradeBand: e.target.value as GradeBand,
                    primarySkillId: '',
                  }));
                }}
                className={cn(
                  'mt-1 block w-full rounded-lg border bg-surface px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary/50',
                  errors.gradeBand ? 'border-error' : 'border-border'
                )}
                aria-invalid={!!errors.gradeBand}
              >
                <option value="">Select grade band</option>
                {GRADE_BANDS.map((g) => (
                  <option key={g} value={g}>
                    {GRADE_BAND_LABELS[g]}
                  </option>
                ))}
              </select>
              {errors.gradeBand && <p className="mt-1 text-sm text-error">{errors.gradeBand}</p>}
            </div>
          </div>

          {/* Primary Skill (Autocomplete) */}
          <div className="relative">
            <label htmlFor="skill-search" className="block text-sm font-medium text-text">
              Primary Skill
            </label>
            <div className="relative mt-1">
              <input
                id="skill-search"
                type="text"
                value={skillSearch}
                onChange={(e) => {
                  setSkillSearch(e.target.value);
                  setShowSkillDropdown(true);
                }}
                onFocus={() => {
                  setShowSkillDropdown(true);
                }}
                className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Search skills..."
                autoComplete="off"
              />
              {selectedSkill && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-text">Selected:</span>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-sm font-medium text-primary">
                    {selectedSkill.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, primarySkillId: '' }));
                    }}
                    className="text-muted hover:text-error"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}
              {showSkillDropdown && filteredSkills.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
                  {filteredSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, primarySkillId: skill.id }));
                        setSkillSearch('');
                        setShowSkillDropdown(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    >
                      <div className="font-medium text-text">{skill.name}</div>
                      {skill.description && (
                        <div className="text-xs text-muted">{skill.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tag-input" className="block text-sm font-medium text-text">
              Tags
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                className="block flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-sm font-medium text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveTag(tag);
                      }}
                      className="rounded-full p-0.5 hover:bg-primary/20"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                router.back();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Learning Object'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
