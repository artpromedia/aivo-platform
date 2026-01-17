'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/study-skills-api';

export function StudyGuides() {
  const [guides, setGuides] = useState<api.StudyGuide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<api.StudyGuide | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingTerm, setAddingTerm] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    try {
      const data = await api.getStudyGuides('user123');
      setGuides(data);
    } catch (error) {
      console.error('Failed to load study guides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (subject: string, topic: string, description: string) => {
    try {
      const guide = await api.createStudyGuide({
        userId: 'user123',
        subject,
        topic,
        description,
      });
      setGuides([...guides, guide]);
      setCreating(false);
    } catch (error) {
      console.error('Failed to create study guide:', error);
    }
  };

  const handleAddKeyTerm = async (term: string, definition: string) => {
    if (!selectedGuide) return;
    try {
      const updated = await api.addKeyTerm(selectedGuide.id, { term, definition });
      setSelectedGuide(updated);
      setGuides(guides.map((g) => (g.id === updated.id ? updated : g)));
      setAddingTerm(false);
    } catch (error) {
      console.error('Failed to add key term:', error);
    }
  };

  const handleAddQuestion = async (
    question: string,
    type: api.PracticeQuestion['type'],
    difficulty: api.PracticeQuestion['difficulty']
  ) => {
    if (!selectedGuide) return;
    try {
      const updated = await api.addPracticeQuestion(selectedGuide.id, {
        question,
        type,
        difficulty,
      });
      setSelectedGuide(updated);
      setGuides(guides.map((g) => (g.id === updated.id ? updated : g)));
      setAddingQuestion(false);
    } catch (error) {
      console.error('Failed to add question:', error);
    }
  };

  const handleDelete = async (guideId: string) => {
    if (!confirm('Delete this study guide?')) return;
    try {
      await api.deleteStudyGuide(guideId);
      setGuides(guides.filter((g) => g.id !== guideId));
      setSelectedGuide(null);
    } catch (error) {
      console.error('Failed to delete study guide:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (selectedGuide) {
    return (
      <div>
        <button
          onClick={() => setSelectedGuide(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Study Guides
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedGuide.topic}</h2>
              <p className="text-slate-600">
                {selectedGuide.subject} • {selectedGuide.estimatedStudyTime} min study time
              </p>
            </div>
            <button
              onClick={() => handleDelete(selectedGuide.id)}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>

          {/* Key Terms Section */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Key Terms</h3>
              <button
                onClick={() => setAddingTerm(true)}
                className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
              >
                + Add Term
              </button>
            </div>

            {addingTerm && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleAddKeyTerm(
                    formData.get('term') as string,
                    formData.get('definition') as string
                  );
                }}
                className="mb-4 space-y-3 rounded border border-slate-200 bg-slate-50 p-4"
              >
                <input
                  type="text"
                  name="term"
                  placeholder="Term"
                  required
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
                <textarea
                  name="definition"
                  placeholder="Definition"
                  required
                  rows={3}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingTerm(false)}
                    className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {selectedGuide.keyTerms.map((term) => (
                <div key={term.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="font-semibold text-slate-900">{term.term}</div>
                  <div className="mt-1 text-sm text-slate-600">{term.definition}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Practice Questions Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Practice Questions</h3>
              <button
                onClick={() => setAddingQuestion(true)}
                className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
              >
                + Add Question
              </button>
            </div>

            {addingQuestion && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleAddQuestion(
                    formData.get('question') as string,
                    formData.get('type') as api.PracticeQuestion['type'],
                    formData.get('difficulty') as api.PracticeQuestion['difficulty']
                  );
                }}
                className="mb-4 space-y-3 rounded border border-slate-200 bg-slate-50 p-4"
              >
                <textarea
                  name="question"
                  placeholder="Question"
                  required
                  rows={3}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    name="type"
                    required
                    className="rounded border border-slate-300 px-3 py-2"
                  >
                    <option value="multipleChoice">Multiple Choice</option>
                    <option value="trueFalse">True/False</option>
                    <option value="shortAnswer">Short Answer</option>
                    <option value="essay">Essay</option>
                  </select>
                  <select
                    name="difficulty"
                    required
                    className="rounded border border-slate-300 px-3 py-2"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingQuestion(false)}
                    className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {selectedGuide.practiceQuestions.map((q, index) => (
                <div key={q.id} className="rounded border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="font-medium text-slate-900">
                      {index + 1}. {q.question}
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        q.difficulty === 'easy'
                          ? 'bg-green-100 text-green-700'
                          : q.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">Type: {q.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Study Guides</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          + New Study Guide
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Create Study Guide</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreate(
                formData.get('subject') as string,
                formData.get('topic') as string,
                formData.get('description') as string
              );
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
              <input
                type="text"
                name="subject"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Topic</label>
              <input
                type="text"
                name="topic"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description (optional)
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-lg bg-slate-200 px-6 py-2 font-medium text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <div
            key={guide.id}
            onClick={() => setSelectedGuide(guide)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md"
          >
            <h3 className="mb-2 text-lg font-semibold text-slate-900">{guide.topic}</h3>
            <p className="mb-4 text-sm text-slate-600">{guide.subject}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{guide.keyTerms.length} terms</span>
              <span>{guide.practiceQuestions.length} questions</span>
              <span>{guide.estimatedStudyTime} min</span>
            </div>
          </div>
        ))}
      </div>

      {guides.length === 0 && !creating && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600">No study guides yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
