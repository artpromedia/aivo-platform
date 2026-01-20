'use client';

/**
 * Lesson Builder Page
 *
 * Full-featured lesson builder interface for teachers
 * Features:
 * - Lesson metadata editing (title, subject, grade, duration)
 * - Learning objectives management
 * - Activity library with drag-and-drop
 * - Standards alignment
 * - Resource management
 * - Preview and publish controls
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  LessonEditor,
  ActivityLibrary,
  StandardsSelector,
  ResourceUploader,
  PreviewPane,
  SavePublishControls,
  type LessonData,
  type LessonActivity,
  type ActivityTemplate,
  type Resource,
} from '@/components/lesson-builder';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const INITIAL_LESSON: LessonData = {
  title: '',
  subject: '',
  gradeLevel: '',
  duration: 45,
  objectives: [],
  standards: [],
  activities: [],
  assessments: [],
  resources: [],
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function LessonBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('id');

  const [lesson, setLesson] = React.useState<LessonData>(INITIAL_LESSON);
  const [showPreview, setShowPreview] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Load existing lesson if editing
  React.useEffect(() => {
    if (lessonId) {
      loadLesson(lessonId);
    }
  }, [lessonId]);

  // Track unsaved changes
  React.useEffect(() => {
    setHasUnsavedChanges(true);
  }, [lesson]);

  const loadLesson = async (id: string) => {
    setIsLoading(true);
    try {
      // In production, this would call the API
      // const response = await api.get<LessonData>(`/api/lessons/${id}`);
      // setLesson(response);

      // Mock loading for now
      await new Promise((resolve) => setTimeout(resolve, 500));
      // setLesson(response);
    } catch {
      // Load failed silently
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITY HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const addActivity = (activity: ActivityTemplate) => {
    const newActivity: LessonActivity = {
      ...activity,
      id: crypto.randomUUID(),
      order: lesson.activities.length,
    };

    setLesson((prev) => ({
      ...prev,
      activities: [...prev.activities, newActivity],
    }));
  };

  const removeActivity = (activityId: string) => {
    setLesson((prev) => ({
      ...prev,
      activities: prev.activities
        .filter((a) => a.id !== activityId)
        .map((a, index) => ({ ...a, order: index })),
    }));
  };

  const reorderActivities = (startIndex: number, endIndex: number) => {
    setLesson((prev) => {
      const result = Array.from(prev.activities);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      return {
        ...prev,
        activities: result.map((a, i) => ({ ...a, order: i })),
      };
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RESOURCE HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const addResource = (resource: Resource) => {
    setLesson((prev) => ({
      ...prev,
      resources: [...prev.resources, resource],
    }));
  };

  const removeResource = (resourceId: string) => {
    setLesson((prev) => ({
      ...prev,
      resources: prev.resources.filter((r) => r.id !== resourceId),
    }));
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SAVE & PUBLISH HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      // In production, this would call the API
      // const response = await api.post('/api/lessons', {
      //   ...lesson,
      //   status: 'draft',
      // });

      // Mock save for now
      await new Promise((resolve) => setTimeout(resolve, 800));

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    setIsPublishing(true);
    try {
      // In production, this would call the API
      // const response = await api.post('/api/lessons', {
      //   ...lesson,
      //   status: 'published',
      //   publishedAt: new Date().toISOString(),
      // });

      // Mock publish for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Navigate to lessons list after publishing
      router.push('/lessons');
    } catch (error) {
      throw error;
    } finally {
      setIsPublishing(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ══════════════════════════════════════════════════════════════════════════

  const canPublish = React.useMemo(() => {
    return (
      lesson.title.trim() !== '' &&
      lesson.subject !== '' &&
      lesson.gradeLevel !== '' &&
      lesson.objectives.length > 0 &&
      lesson.activities.length > 0
    );
  }, [lesson]);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/lessons">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lessons
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">
              {lessonId ? 'Edit Lesson' : 'Create New Lesson'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Build an engaging lesson for your students
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor */}
        <main className="flex-1 overflow-y-auto p-8">
          <LessonEditor
            lesson={lesson}
            onChange={setLesson}
            onAddActivity={addActivity}
            onRemoveActivity={removeActivity}
            onReorderActivities={reorderActivities}
          />
        </main>

        {/* Sidebar - Activity Library & Tools */}
        <aside className="w-96 overflow-y-auto border-l bg-white">
          <div className="space-y-6 p-6">
            <StandardsSelector
              selected={lesson.standards}
              onChange={(standards) => setLesson((prev) => ({ ...prev, standards }))}
              subjectFilter={lesson.subject}
              gradeLevelFilter={lesson.gradeLevel}
            />

            <div className="border-t pt-6">
              <ActivityLibrary
                onSelect={addActivity}
                subjectFilter={lesson.subject}
                gradeLevelFilter={lesson.gradeLevel}
              />
            </div>

            <div className="border-t pt-6">
              <ResourceUploader
                resources={lesson.resources}
                onUpload={addResource}
                onRemove={removeResource}
              />
            </div>

            <div className="border-t pt-6">
              <SavePublishControls
                onSaveDraft={saveDraft}
                onPublish={publish}
                onPreview={() => setShowPreview(true)}
                isSaving={isSaving}
                isPublishing={isPublishing}
                lastSaved={lastSaved}
                hasUnsavedChanges={hasUnsavedChanges}
                canPublish={canPublish}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewPane lesson={lesson} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
