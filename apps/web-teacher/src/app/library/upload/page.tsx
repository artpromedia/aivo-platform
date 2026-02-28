'use client';

/**
 * Upload Resource Page
 *
 * Form for teachers to upload lesson plans, activities, assessments,
 * templates, and media to their personal resource library.
 *
 * Uses useUploadResource hook → /api/library/resources → content-svc.
 */

import { Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useRef, useState } from 'react';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import {
  type ResourceType,
  type ResourceCategory,
  useUploadResource,
} from '@/hooks/use-library';

// ── Option lists ─────────────────────────────────────────────────────────────

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'lesson_plan', label: 'Lesson Plan' },
  { value: 'activity', label: 'Activity' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'template', label: 'Template' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'document', label: 'Document' },
  { value: 'media', label: 'Media' },
];

const CATEGORIES: { value: ResourceCategory; label: string }[] = [
  { value: 'lesson_plans', label: 'Lesson Plans' },
  { value: 'activities', label: 'Activities' },
  { value: 'assessments', label: 'Assessments' },
  { value: 'templates', label: 'Templates' },
  { value: 'media', label: 'Media' },
];

const SUBJECTS = [
  'Mathematics',
  'English Language Arts',
  'Science',
  'Social Studies',
  'Computer Science',
  'Foreign Language',
  'Art',
  'Music',
  'Physical Education',
  'Other',
];

const GRADE_LEVELS = [
  'Pre-K',
  'K–2',
  'Grades 3–5',
  'Grades 6–8',
  'Grades 9–12',
  'All Grades',
];

const ACCEPTED_FILE_TYPES =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.gif,.mp4,.mp3,.zip';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ── Component ────────────────────────────────────────────────────────────────

export default function UploadResourcePage() {
  const router = useRouter();
  const uploadMutation = useUploadResource();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ResourceType>('lesson_plan');
  const [category, setCategory] = useState<ResourceCategory>('lesson_plans');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    setFileError(null);
    if (f.size > MAX_FILE_SIZE) {
      setFileError('File exceeds 50 MB limit.');
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const removeFile = useCallback(() => {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    uploadMutation.mutate(
      {
        title,
        description,
        type,
        category,
        subject,
        gradeLevel,
        tags: tagList,
        isPublic,
        file: file ?? undefined,
      },
      {
        onSuccess: () => {
          router.push('/library?tab=resources');
        },
      },
    );
  }

  const isValid = title.trim().length > 0 && subject && gradeLevel;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/library?tab=resources"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      <Heading kicker="Library" className="text-headline font-semibold">
        Upload Resource
      </Heading>
      <p className="text-muted">
        Share lesson plans, activities, assessments, and other materials with
        your personal library{' '}
        {isPublic ? 'and your colleagues' : '(private by default)'}.
      </p>

      {/* Success banner */}
      {uploadMutation.isSuccess && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">
            Resource uploaded successfully! Redirecting…
          </span>
        </div>
      )}

      {/* Error banner */}
      {uploadMutation.isError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : 'Upload failed. Please try again.'}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── File drop zone ───────────────────────────────────────────── */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            File <span className="text-muted">(optional)</span>
          </label>

          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:border-primary/50'
              }`}
            >
              <Upload className="mb-3 h-8 w-8 text-muted" />
              <p className="text-sm font-medium">
                Drag & drop a file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-muted">
                PDF, DOCX, PPTX, images, audio, video (max 50 MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
              <FileText className="h-8 w-8 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="rounded p-1 text-muted hover:bg-surface-muted hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {fileError && (
            <p className="mt-1 text-sm text-red-600">{fileError}</p>
          )}
        </div>

        {/* ── Title ────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fractions Unit — Lesson 3 Worksheet"
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* ── Description ──────────────────────────────────────────────── */}
        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Briefly describe the resource…"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* ── Type & Category (side-by-side) ───────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
              Resource Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as ResourceType)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {RESOURCE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-1.5 block text-sm font-medium"
            >
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ResourceCategory)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CATEGORIES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Subject & Grade Level ────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="subject"
              className="mb-1.5 block text-sm font-medium"
            >
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select subject…</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="grade" className="mb-1.5 block text-sm font-medium">
              Grade Level <span className="text-red-500">*</span>
            </label>
            <select
              id="grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select grade level…</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Tags ─────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="tags" className="mb-1.5 block text-sm font-medium">
            Tags <span className="text-muted">(comma-separated)</span>
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. fractions, math, worksheet"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* ── Visibility toggle ────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              isPublic ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                isPublic ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div>
            <p className="text-sm font-medium">
              {isPublic ? 'Public' : 'Private'}
            </p>
            <p className="text-xs text-muted">
              {isPublic
                ? 'Visible to other teachers in your school'
                : 'Only visible to you'}
            </p>
          </div>
        </div>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-t border-border pt-6">
          <button
            type="submit"
            disabled={!isValid || uploadMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Resource
              </>
            )}
          </button>

          <Link
            href="/library?tab=resources"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-muted"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
