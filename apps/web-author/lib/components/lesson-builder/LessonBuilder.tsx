/**
 * Interactive Lesson Builder
 * Main component for building interactive lessons with sections and activities
 */

'use client';

import React from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  Layers,
  Play,
  Redo2,
  Save,
  Settings,
  Undo2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useLessonBuilder } from './LessonBuilderContext';
import { SectionList } from './SectionList';
import { ActivityEditor } from './ActivityEditor';
import { LessonSettings } from './LessonSettings';
import { LessonPreview } from './LessonPreview';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LessonBuilderProps {
  onSave?: (lesson: ReturnType<typeof useLessonBuilder>['state']['lesson']) => Promise<void>;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function LessonBuilder({ onSave }: LessonBuilderProps) {
  const { state, dispatch, validateLesson, getSelectedActivity } = useLessonBuilder();
  const [showSettings, setShowSettings] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const selectedActivity = getSelectedActivity();

  const handleSave = async () => {
    const errors = validateLesson();
    const hasErrors = errors.some((e) => e.severity === 'error');

    if (hasErrors) {
      return;
    }

    if (onSave && state.lesson) {
      setIsSaving(true);
      try {
        await onSave(state.lesson);
        dispatch({ type: 'MARK_CLEAN' });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
  };

  const handleRedo = () => {
    dispatch({ type: 'REDO' });
  };

  const togglePreview = () => {
    dispatch({ type: 'TOGGLE_PREVIEW' });
  };

  if (!state.lesson) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No Lesson Loaded</h2>
          <p className="text-gray-500">Create a new lesson or load an existing one to get started.</p>
        </div>
      </div>
    );
  }

  if (state.isPreviewMode) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-600" />
            <span className="font-medium">Preview Mode</span>
          </div>
          <button
            onClick={togglePreview}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            <EyeOff className="w-4 h-4" />
            Exit Preview
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <LessonPreview lesson={state.lesson} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <input
              type="text"
              value={state.lesson.title}
              onChange={(e) =>
                dispatch({ type: 'UPDATE_LESSON', payload: { title: e.target.value } })
              }
              className="text-lg font-semibold border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              placeholder="Lesson Title"
            />
          </div>

          {state.isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={state.undoStack.length === 0}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={state.redoStack.length === 0}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-200" />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg ${showSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Lesson Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Preview */}
          <button
            onClick={togglePreview}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg text-sm"
            title="Preview Lesson"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving || !state.isDirty}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {state.validationErrors.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {state.validationErrors.filter((e) => e.severity === 'error').length} errors,{' '}
              {state.validationErrors.filter((e) => e.severity === 'warning').length} warnings
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sections Panel */}
        <div className="w-80 border-r bg-white overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Layers className="w-4 h-4" />
              Lesson Structure
            </div>
          </div>
          <SectionList />
        </div>

        {/* Activity Editor */}
        <div className="flex-1 overflow-y-auto">
          {selectedActivity ? (
            <ActivityEditor />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select an activity to edit</p>
                <p className="text-sm text-gray-400 mt-1">or add a new activity to a section</p>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 border-l bg-white overflow-y-auto">
            <LessonSettings onClose={() => setShowSettings(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default LessonBuilder;
