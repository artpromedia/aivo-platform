'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/study-skills-api';

export function NoteTakingTemplates() {
  const [templates, setTemplates] = useState<api.NoteTemplate[]>([]);
  const [notes, setNotes] = useState<api.Note[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<api.NoteTemplate | null>(null);
  const [selectedNote, setSelectedNote] = useState<api.Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, notesData] = await Promise.all([
        api.getNoteTemplates('user123'),
        api.getNotes('user123'),
      ]);
      setTemplates(templatesData);
      setNotes(notesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (name: string, type: api.NoteTemplate['type']) => {
    try {
      await api.createNoteTemplate({
        userId: 'user123',
        name,
        type,
      });
      await loadData();
      setCreating(false);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleCreateNote = async (templateId: string, subject: string, title: string) => {
    try {
      const note = await api.createNote({
        userId: 'user123',
        templateId,
        subject,
        title,
      });
      setNotes([...notes, note]);
      setSelectedNote(note);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string, sections: api.NoteSection[]) => {
    try {
      const updated = await api.updateNote(noteId, { sections });
      setNotes(notes.map((n) => (n.id === noteId ? updated : n)));
      setSelectedNote(updated);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.deleteNoteTemplate(templateId);
      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.deleteNote(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
      setSelectedNote(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (selectedNote) {
    return (
      <div>
        <button
          onClick={() => setSelectedNote(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Notes
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedNote.title}</h2>
              <p className="text-sm text-slate-600">
                {selectedNote.subject} • {selectedNote.wordCount} words
              </p>
            </div>
            <button
              onClick={() => handleDeleteNote(selectedNote.id)}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>

          <div className="space-y-4">
            {selectedNote.sections.map((section, index) => (
              <div key={section.id} className="rounded border border-slate-200 p-4">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => {
                    const newSections = [...selectedNote.sections];
                    newSections[index] = { ...section, title: e.target.value };
                    handleUpdateNote(selectedNote.id, newSections);
                  }}
                  className="mb-2 w-full border-b border-slate-300 bg-transparent text-lg font-semibold focus:border-indigo-500 focus:outline-none"
                  placeholder="Section Title"
                />
                <textarea
                  value={section.content}
                  onChange={(e) => {
                    const newSections = [...selectedNote.sections];
                    newSections[index] = { ...section, content: e.target.value };
                    handleUpdateNote(selectedNote.id, newSections);
                  }}
                  className="w-full resize-none border-0 bg-transparent focus:outline-none"
                  rows={4}
                  placeholder="Write your notes here..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedTemplate) {
    return (
      <div>
        <button
          onClick={() => setSelectedTemplate(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Templates
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Create Note from Template</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateNote(
                selectedTemplate.id,
                formData.get('subject') as string,
                formData.get('title') as string
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Note Title</label>
              <input
                type="text"
                name="title"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
            >
              Create Note
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Templates Column */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Note Templates</h2>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New Template
          </button>
        </div>

        {creating && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateTemplate(
                  formData.get('name') as string,
                  formData.get('type') as api.NoteTemplate['type']
                );
              }}
              className="space-y-3"
            >
              <input
                type="text"
                name="name"
                placeholder="Template Name"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
              <select
                name="type"
                required
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="cornell">Cornell Notes</option>
                <option value="outline">Outline</option>
                <option value="mindMap">Mind Map</option>
                <option value="twoColumn">Two Column</option>
                <option value="custom">Custom</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{template.name}</h3>
                  <p className="text-sm text-slate-600">{template.type}</p>
                  <div className="mt-2 flex gap-2">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="rounded bg-indigo-100 px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-200"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="rounded bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes Column */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-900">My Notes</h2>
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300"
            >
              <h3 className="font-semibold text-slate-900">{note.title}</h3>
              <p className="text-sm text-slate-600">{note.subject}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>{note.wordCount} words</span>
                <span>{new Date(note.lastEdited).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No notes yet. Create one using a template!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
