'use client';

export const dynamic = 'force-dynamic';

/**
 * AI Lesson Generator Page
 *
 * Wraps the shared LessonGenerator component from @aivo/ui-web,
 * adding breadcrumbs, save-as-draft, and edit-in-builder navigation.
 */

import { ArrowLeft, Loader2, Save, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { LessonGenerator } from '@aivo/ui-web';

import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface GeneratedLesson {
  id: string;
  title: string;
  subject: string;
  topic: string;
  objectives: string[];
  blocks: { id: string; type: string; content: string; duration?: number }[];
  vocabulary: { term: string; definition: string }[];
  assessmentQuestions: { id: string; questionText: string; options?: string[]; correctAnswer: string }[];
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function LessonsAIGeneratePage() {
  const router = useRouter();
  const [generatedLesson, setGeneratedLesson] = React.useState<GeneratedLesson | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [savedLessonId, setSavedLessonId] = React.useState<string | null>(null);

  const handleGenerate = React.useCallback((lesson: GeneratedLesson) => {
    setGeneratedLesson(lesson);
    setSavedLessonId(null);
    setSaveError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    setSaveError(error.message);
  }, []);

  const handleSaveDraft = async () => {
    if (!generatedLesson) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generatedLesson,
          status: 'draft',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save lesson draft');
      }

      const data = (await res.json()) as { id?: string; data?: { id?: string } };
      const lessonId = data.id || data.data?.id || generatedLesson.id;
      setSavedLessonId(lessonId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEditInBuilder = () => {
    const id = savedLessonId || generatedLesson?.id;
    if (id) {
      router.push(`/lessons/builder?id=${id}`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: 'Lessons', href: '/lessons' },
          { label: 'AI Generator' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/lessons"
          className="flex items-center gap-1 text-sm text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lessons
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">AI Lesson Generator</h1>
            <p className="text-sm text-muted">
              Create engaging lesson plans powered by AI
            </p>
          </div>
        </div>

        {/* Action buttons (visible when lesson generated) */}
        {generatedLesson && (
          <div className="flex gap-2">
            <Button
              onClick={() => void handleSaveDraft()}
              disabled={saving}
              variant="outline"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : savedLessonId ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Saved as Draft ✓
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </>
              )}
            </Button>
            <Button onClick={handleEditInBuilder}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Edit in Builder
            </Button>
          </div>
        )}
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Lesson Generator Component */}
      <div className="rounded-xl border border-border bg-surface">
        <LessonGenerator
          apiEndpoint="/api/ai/generation/lessons"
          onGenerate={handleGenerate}
          onError={handleError}
          className="p-0"
        />
      </div>
    </div>
  );
}
