'use client';

import { useState, useEffect } from 'react';
import {
  VisualNotebook,
  VisualNote,
  getVisualNotebooks,
  getVisualNotebook,
  createVisualNotebook,
  updateVisualNotebook,
  deleteVisualNotebook,
  addVisualNote,
  updateVisualNote,
  deleteVisualNote,
  exportVisualNotebook,
} from '@/lib/visual-learning-api';

const GRID_TYPES = ['none', 'dots', 'lines', 'graph'] as const;
const NOTE_TYPES = ['sketch', 'diagram', 'table', 'chart', 'mixed'] as const;

export function VisualNoteTaking() {
  const [notebooks, setNotebooks] = useState<VisualNotebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<VisualNotebook | null>(null);
  const [selectedNote, setSelectedNote] = useState<VisualNote | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
    try {
      const nbs = await getVisualNotebooks('user123');
      setNotebooks(nbs);
    } catch (error) {
      console.error('Failed to load notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotebook = async (title: string, description: string, subject?: string) => {
    try {
      const newNotebook = await createVisualNotebook({
        userId: 'user123',
        title,
        description,
        subject,
      });
      setNotebooks([newNotebook, ...notebooks]);
      setSelectedNotebook(newNotebook);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create notebook:', error);
    }
  };

  const handleSelectNotebook = async (notebookId: string) => {
    try {
      const notebook = await getVisualNotebook(notebookId);
      setSelectedNotebook(notebook);
      setSelectedNote(null);
    } catch (error) {
      console.error('Failed to load notebook:', error);
    }
  };

  const handleUpdateNotebook = async (updates: Partial<VisualNotebook>) => {
    if (!selectedNotebook) return;
    try {
      const updated = await updateVisualNotebook(selectedNotebook.id, updates);
      setSelectedNotebook(updated);
      setNotebooks(notebooks.map((n) => (n.id === updated.id ? updated : n)));
    } catch (error) {
      console.error('Failed to update notebook:', error);
    }
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    if (!confirm('Delete this notebook and all notes?')) return;
    try {
      await deleteVisualNotebook(notebookId);
      setNotebooks(notebooks.filter((n) => n.id !== notebookId));
      if (selectedNotebook?.id === notebookId) {
        setSelectedNotebook(null);
      }
    } catch (error) {
      console.error('Failed to delete notebook:', error);
    }
  };

  const handleAddNote = async (type: VisualNote['type']) => {
    if (!selectedNotebook) return;
    try {
      const updated = await addVisualNote(selectedNotebook.id, {
        type,
        content: '',
        position: selectedNotebook.notes.length,
      });
      setSelectedNotebook(updated);
      setNotebooks(notebooks.map((n) => (n.id === updated.id ? updated : n)));
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleUpdateNote = async (noteId: string, updates: Partial<VisualNote>) => {
    if (!selectedNotebook) return;
    try {
      const updated = await updateVisualNote(selectedNotebook.id, noteId, updates);
      setSelectedNotebook(updated);
      setNotebooks(notebooks.map((n) => (n.id === updated.id ? updated : n)));
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedNotebook || !confirm('Delete this note?')) return;
    try {
      const updated = await deleteVisualNote(selectedNotebook.id, noteId);
      setSelectedNotebook(updated);
      setNotebooks(notebooks.map((n) => (n.id === updated.id ? updated : n)));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleExport = async (format: 'pdf' | 'png') => {
    if (!selectedNotebook) return;
    try {
      const blob = await exportVisualNotebook(selectedNotebook.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedNotebook.title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export notebook:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Notebooks</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              New
            </button>
          </div>

          <div className="space-y-2">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedNotebook?.id === notebook.id
                    ? 'bg-indigo-50 border-2 border-indigo-600'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleSelectNotebook(notebook.id)}
              >
                <h3 className="font-medium text-sm">{notebook.title}</h3>
                {notebook.subject && (
                  <p className="text-xs text-gray-600 mt-1">{notebook.subject}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{notebook.notes.length} notes</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotebook(notebook.id);
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="lg:col-span-3">
        {isCreating && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New Notebook</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateNotebook(
                  formData.get('title') as string,
                  formData.get('description') as string,
                  formData.get('subject') as string || undefined
                );
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    name="subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {selectedNotebook ? (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Toolbar */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-semibold">{selectedNotebook.title}</h2>
                  <p className="text-sm text-gray-600">{selectedNotebook.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Grid Type Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Grid:</span>
                {GRID_TYPES.map((gridType) => (
                  <button
                    key={gridType}
                    onClick={() => handleUpdateNotebook({ gridType })}
                    className={`px-3 py-1 text-xs rounded capitalize ${
                      selectedNotebook.gridType === gridType
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {gridType}
                  </button>
                ))}
              </div>

              {/* Add Note Buttons */}
              <div className="flex items-center space-x-2 mt-3">
                <span className="text-sm text-gray-600">Add:</span>
                {NOTE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAddNote(type)}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded capitalize hover:bg-green-700"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Grid */}
            <div
              className="p-6"
              style={{
                backgroundColor: selectedNotebook.backgroundColor,
                minHeight: '600px',
                backgroundImage:
                  selectedNotebook.gridType === 'dots'
                    ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
                    : selectedNotebook.gridType === 'lines'
                    ? 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)'
                    : selectedNotebook.gridType === 'graph'
                    ? 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)'
                    : undefined,
                backgroundSize:
                  selectedNotebook.gridType === 'dots'
                    ? '20px 20px'
                    : selectedNotebook.gridType === 'lines'
                    ? '100% 30px, 30px 100%'
                    : selectedNotebook.gridType === 'graph'
                    ? '20px 20px'
                    : undefined,
              }}
            >
              {selectedNotebook.notes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No notes yet. Add your first note above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedNotebook.notes
                    .sort((a, b) => a.position - b.position)
                    .map((note) => (
                      <div
                        key={note.id}
                        className="bg-white border-2 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-gray-600 uppercase px-2 py-1 bg-gray-100 rounded">
                            {note.type}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>

                        {note.type === 'sketch' && (
                          <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-[200px] bg-gray-50">
                            <p className="text-center text-gray-500">Sketch Area</p>
                            <p className="text-center text-xs text-gray-400 mt-2">
                              Draw your visual notes here
                            </p>
                          </div>
                        )}

                        {note.type === 'diagram' && (
                          <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-[200px] bg-gray-50">
                            <p className="text-center text-gray-500">Diagram Area</p>
                          </div>
                        )}

                        {note.type === 'table' && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full border border-gray-300">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="border border-gray-300 px-4 py-2">Column 1</th>
                                  <th className="border border-gray-300 px-4 py-2">Column 2</th>
                                  <th className="border border-gray-300 px-4 py-2">Column 3</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-gray-300 px-4 py-2">Data 1</td>
                                  <td className="border border-gray-300 px-4 py-2">Data 2</td>
                                  <td className="border border-gray-300 px-4 py-2">Data 3</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {note.type === 'chart' && (
                          <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-[200px] bg-gray-50">
                            <p className="text-center text-gray-500">Chart Area</p>
                          </div>
                        )}

                        {note.type === 'mixed' && (
                          <div>
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                              rows={6}
                              placeholder="Mixed content notes..."
                              value={note.content}
                              onChange={(e) => handleUpdateNote(note.id, { content: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>Notes: {selectedNotebook.notes.length}</div>
                <div>Last updated: {new Date(selectedNotebook.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Notebook Selected</h3>
            <p className="mt-2 text-gray-600">
              Select a notebook from the sidebar or create a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
