'use client';

import { useState } from 'react';
import { createFolder, addItemToFolder } from '../../../../lib/executive-function-api';
import type { OrganizationFolder, OrganizationItem } from '../../../../lib/executive-function-api';

interface OrganizationToolsProps {
  learnerId: string;
  folders: OrganizationFolder[];
  onUpdate: () => void;
}

/**
 * Organization Tools Component
 * 
 * Folder system for organizing notes, files, and resources
 */
export function OrganizationTools({ learnerId, folders, onUpdate }: OrganizationToolsProps) {
  const [selectedFolder, setSelectedFolder] = useState<OrganizationFolder | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  async function handleCreateFolder(folderData: Partial<OrganizationFolder>) {
    try {
      await createFolder(learnerId, folderData);
      setShowCreateFolder(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  }

  async function handleAddItem(folderId: string, itemData: Partial<OrganizationItem>) {
    try {
      await addItemToFolder(folderId, itemData);
      setShowAddItem(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item. Please try again.');
    }
  }

  function getTotalItems(): number {
    return folders.reduce((total, folder) => total + folder.items.length, 0);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{folders.length}</div>
          <div className="mt-1 text-sm text-white/80">Folders</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-teal-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{getTotalItems()}</div>
          <div className="mt-1 text-sm text-white/80">Total Items</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">
            {folders.filter((f) => f.items.some((i) => i.type === 'note')).length}
          </div>
          <div className="mt-1 text-sm text-white/80">Folders with Notes</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateFolder(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Folder
        </button>
      </div>

      {/* Folders Grid */}
      {folders.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow">
          <div className="text-5xl">📁</div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">No folders yet</h3>
          <p className="mt-2 text-slate-600">Create folders to organize your learning materials</p>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Folder
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => setSelectedFolder(folder)}
              className="cursor-pointer rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
              style={{ borderLeft: `4px solid ${folder.color}` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{folder.icon}</div>
                  <div>
                    <h3 className="font-bold text-slate-900">{folder.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {folder.items.length} {folder.items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
              </div>

              {folder.items.length > 0 && (
                <div className="mt-4 space-y-2">
                  {folder.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <span>
                        {item.type === 'note' && '📝'}
                        {item.type === 'file' && '📄'}
                        {item.type === 'link' && '🔗'}
                        {item.type === 'task' && '✓'}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                  {folder.items.length > 3 && (
                    <div className="text-sm text-slate-500">
                      +{folder.items.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <FolderForm onSubmit={handleCreateFolder} onCancel={() => setShowCreateFolder(false)} />
      )}

      {/* Folder Details Modal */}
      {selectedFolder && (
        <FolderDetailsModal
          folder={selectedFolder}
          onAddItem={() => setShowAddItem(true)}
          onClose={() => setSelectedFolder(null)}
        />
      )}

      {/* Add Item Modal */}
      {showAddItem && selectedFolder && (
        <ItemForm
          folderId={selectedFolder.id}
          onSubmit={(data) => handleAddItem(selectedFolder.id, data)}
          onCancel={() => setShowAddItem(false)}
        />
      )}
    </div>
  );
}

// Folder Form Component
function FolderForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Partial<OrganizationFolder>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    icon: '📁',
  });

  const iconOptions = ['📁', '📚', '🎯', '💡', '🔬', '✏️', '🎨', '🎵', '⚡', '🌟'];
  const colorOptions = [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // orange
    '#EF4444', // red
    '#EC4899', // pink
    '#14B8A6', // teal
    '#6366F1', // indigo
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(formData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">New Folder</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Folder Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Science Notes"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Icon</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`rounded-lg border-2 p-3 text-2xl transition ${
                    formData.icon === icon
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Color</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-10 w-10 rounded-lg border-2 transition ${
                    formData.color === color ? 'border-slate-900 scale-110' : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Create Folder
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Folder Details Modal Component
function FolderDetailsModal({
  folder,
  onAddItem,
  onClose,
}: {
  folder: OrganizationFolder;
  onAddItem: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{folder.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{folder.name}</h2>
              <p className="mt-1 text-slate-600">{folder.items.length} items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mt-6">
          <div className="mb-4 flex justify-between">
            <h3 className="font-bold text-slate-900">Items</h3>
            <button
              onClick={onAddItem}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add Item
            </button>
          </div>

          {folder.items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-600">No items in this folder yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {folder.items.map((item) => (
                <div key={item.id} className="rounded-lg border-2 border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {item.type === 'note' && '📝'}
                      {item.type === 'file' && '📄'}
                      {item.type === 'link' && '🔗'}
                      {item.type === 'task' && '✓'}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      {item.content && (
                        <p className="mt-1 text-sm text-slate-600">{item.content}</p>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-sm text-blue-600 hover:text-blue-700"
                        >
                          {item.url}
                        </a>
                      )}
                      {item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Item Form Component
function ItemForm({
  folderId,
  onSubmit,
  onCancel,
}: {
  folderId: string;
  onSubmit: (data: Partial<OrganizationItem>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    type: 'note' as 'note' | 'file' | 'link' | 'task',
    title: '',
    content: '',
    url: '',
    tags: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...formData,
      folderId,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Add Item</h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="note">Note</option>
              <option value="file">File</option>
              <option value="link">Link</option>
              <option value="task">Task Reference</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Item title"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {(formData.type === 'note' || formData.type === 'file') && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                placeholder="Add notes or description"
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {formData.type === 'link' && (
            <div>
              <label className="block text-sm font-medium text-slate-700">URL *</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required={formData.type === 'link'}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="important, exam, chapter 5"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Add Item
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
