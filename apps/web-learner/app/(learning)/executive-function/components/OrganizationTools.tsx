'use client';

import { useState, useMemo } from 'react';
import { createFolder, addItemToFolder, deleteItem, deleteFolder } from '../../../../lib/executive-function-api';
import type { OrganizationFolder, OrganizationItem } from '../../../../lib/executive-function-api';

interface OrganizationToolsProps {
  learnerId: string;
  folders: OrganizationFolder[];
  onUpdate: () => void;
}

type ViewMode = 'grid' | 'list';
type SortMode = 'name' | 'date' | 'items';

// Folder templates for quick creation
const FOLDER_TEMPLATES = [
  { name: 'School Subjects', icon: '🏫', color: '#3B82F6', folders: ['Math', 'Science', 'English', 'History'] },
  { name: 'Project', icon: '📋', color: '#10B981', folders: ['Research', 'Notes', 'Resources', 'Final'] },
  { name: 'Study System', icon: '📚', color: '#8B5CF6', folders: ['To Review', 'In Progress', 'Completed'] },
];

// Quick checklist templates
const CHECKLIST_TEMPLATES = [
  {
    name: 'Homework Checklist',
    items: ['Check assignment requirements', 'Gather materials', 'Start rough draft', 'Review and edit', 'Submit'],
  },
  {
    name: 'Test Prep',
    items: ['Review notes', 'Make flashcards', 'Practice problems', 'Get good sleep', 'Eat breakfast'],
  },
  {
    name: 'Project Checklist',
    items: ['Choose topic', 'Research', 'Create outline', 'First draft', 'Add visuals', 'Final review'],
  },
];

/**
 * Organization Tools Component
 *
 * Enhanced folder system for organizing notes, files, and resources
 * with search, filtering, checklists, and quick notes
 */
export function OrganizationTools({ learnerId, folders, onUpdate }: Readonly<OrganizationToolsProps>) {
  const [selectedFolder, setSelectedFolder] = useState<OrganizationFolder | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [favoriteFolders, setFavoriteFolders] = useState<string[]>([]);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [activeChecklist, setActiveChecklist] = useState<{ name: string; items: { text: string; done: boolean }[] } | null>(null);

  // Computed values
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    folders.forEach((folder) => {
      folder.items.forEach((item) => {
        item.tags.forEach((tag) => tags.add(tag));
      });
    });
    return Array.from(tags);
  }, [folders]);

  const filteredFolders = useMemo(() => {
    let result = [...folders];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (folder) =>
          folder.name.toLowerCase().includes(query) ||
          folder.items.some(
            (item) =>
              item.title.toLowerCase().includes(query) ||
              item.content?.toLowerCase().includes(query) ||
              item.tags.some((tag) => tag.toLowerCase().includes(query))
          )
      );
    }

    // Tag filter
    if (filterTag) {
      result = result.filter((folder) =>
        folder.items.some((item) => item.tags.includes(filterTag))
      );
    }

    // Sort
    result.sort((a, b) => {
      // Favorites always first
      const aFav = favoriteFolders.includes(a.id);
      const bFav = favoriteFolders.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      switch (sortMode) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'items':
          return b.items.length - a.items.length;
        case 'date':
          const aDate = a.items[0]?.createdAt || '';
          const bDate = b.items[0]?.createdAt || '';
          return bDate.localeCompare(aDate);
        default:
          return 0;
      }
    });

    return result;
  }, [folders, searchQuery, filterTag, sortMode, favoriteFolders]);

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

  async function handleDeleteFolder(folderId: string) {
    if (!confirm('Are you sure you want to delete this folder and all its items?')) return;
    try {
      await deleteFolder(folderId);
      setSelectedFolder(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      alert('Failed to delete folder. Please try again.');
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteItem(itemId);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    }
  }

  async function handleCreateFromTemplate(template: typeof FOLDER_TEMPLATES[0]) {
    try {
      for (const folderName of template.folders) {
        await createFolder(learnerId, {
          name: folderName,
          icon: template.icon,
          color: template.color,
        });
      }
      setShowTemplates(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to create folders from template:', error);
      alert('Failed to create folders. Please try again.');
    }
  }

  function toggleFavorite(folderId: string) {
    setFavoriteFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  }

  function startChecklist(template: typeof CHECKLIST_TEMPLATES[0]) {
    setActiveChecklist({
      name: template.name,
      items: template.items.map((text) => ({ text, done: false })),
    });
    setShowChecklist(false);
  }

  function toggleChecklistItem(index: number) {
    if (!activeChecklist) return;
    setActiveChecklist({
      ...activeChecklist,
      items: activeChecklist.items.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      ),
    });
  }

  function getTotalItems(): number {
    return folders.reduce((total, folder) => total + folder.items.length, 0);
  }

  const noteCount = folders.reduce(
    (total, folder) => total + folder.items.filter((i) => i.type === 'note').length,
    0
  );

  const linkCount = folders.reduce(
    (total, folder) => total + folder.items.filter((i) => i.type === 'link').length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{folders.length}</div>
          <div className="mt-1 text-sm text-white/80">Folders</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-teal-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{getTotalItems()}</div>
          <div className="mt-1 text-sm text-white/80">Total Items</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{noteCount}</div>
          <div className="mt-1 text-sm text-white/80">Notes</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg">
          <div className="text-3xl font-bold">{linkCount}</div>
          <div className="mt-1 text-sm text-white/80">Links</div>
        </div>
      </div>

      {/* Active Checklist */}
      {activeChecklist && (
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">✅ {activeChecklist.name}</h3>
            <button
              onClick={() => setActiveChecklist(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {activeChecklist.items.map((item, index) => (
              <button
                key={`checklist-${index}`}
                onClick={() => toggleChecklistItem(index)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${
                  item.done ? 'bg-green-50' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    item.done
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-slate-300'
                  }`}
                >
                  {item.done && '✓'}
                </span>
                <span className={item.done ? 'text-slate-500 line-through' : 'text-slate-900'}>
                  {item.text}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm text-slate-600">
            {activeChecklist.items.filter((i) => i.done).length} of {activeChecklist.items.length}{' '}
            completed
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div className="rounded-xl bg-white p-4 shadow">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search folders and items..."
              className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* View Mode */}
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                viewMode === 'grid' ? 'bg-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                viewMode === 'list' ? 'bg-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List
            </button>
          </div>

          {/* Sort */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="items">Sort by Items</option>
            <option value="date">Sort by Recent</option>
          </select>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-slate-500">Filter by tag:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filterTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
            {filterTag && (
              <button
                onClick={() => setFilterTag(null)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowCreateFolder(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Folder
        </button>
        <button
          onClick={() => setShowTemplates(true)}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          📋 Use Template
        </button>
        <button
          onClick={() => setShowQuickNote(true)}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          📝 Quick Note
        </button>
        <button
          onClick={() => setShowChecklist(true)}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          ✅ Checklist
        </button>
      </div>

      {/* Folders */}
      {filteredFolders.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow">
          <div className="text-5xl">📁</div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            {searchQuery || filterTag ? 'No matching folders' : 'No folders yet'}
          </h3>
          <p className="mt-2 text-slate-600">
            {searchQuery || filterTag
              ? 'Try adjusting your search or filters'
              : 'Create folders to organize your learning materials'}
          </p>
          {!searchQuery && !filterTag && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setShowCreateFolder(true)}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Folder
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Use Template
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              className="group relative rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
              style={{ borderLeft: `4px solid ${folder.color}` }}
            >
              {/* Favorite button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(folder.id);
                }}
                className="absolute right-4 top-4 text-xl opacity-0 transition group-hover:opacity-100"
              >
                {favoriteFolders.includes(folder.id) ? '⭐' : '☆'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedFolder(folder)}
                className="block w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{folder.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{folder.name}</h3>
                      {favoriteFolders.includes(folder.id) && (
                        <span className="text-yellow-500">⭐</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {folder.items.length} {folder.items.length === 1 ? 'item' : 'items'}
                    </p>
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
                      <div className="text-sm text-slate-500">+{folder.items.length - 3} more</div>
                    )}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedFolder(folder)}
              className="flex w-full items-center gap-4 rounded-lg bg-white p-4 shadow transition hover:shadow-md"
              style={{ borderLeft: `4px solid ${folder.color}` }}
            >
              <div className="text-2xl">{folder.icon}</div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{folder.name}</h3>
                  {favoriteFolders.includes(folder.id) && <span className="text-yellow-500">⭐</span>}
                </div>
                <p className="text-sm text-slate-600">
                  {folder.items.length} {folder.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(folder.id);
                }}
                className="text-xl text-slate-400 hover:text-yellow-500"
              >
                {favoriteFolders.includes(folder.id) ? '⭐' : '☆'}
              </button>
            </button>
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
          onDeleteItem={handleDeleteItem}
          onDeleteFolder={() => handleDeleteFolder(selectedFolder.id)}
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

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          templates={FOLDER_TEMPLATES}
          onSelect={handleCreateFromTemplate}
          onCancel={() => setShowTemplates(false)}
        />
      )}

      {/* Quick Note Modal */}
      {showQuickNote && (
        <QuickNoteModal
          folders={folders}
          onSubmit={async (folderId, noteData) => {
            await handleAddItem(folderId, noteData);
            setShowQuickNote(false);
          }}
          onCancel={() => setShowQuickNote(false)}
        />
      )}

      {/* Checklist Selection Modal */}
      {showChecklist && (
        <ChecklistModal
          templates={CHECKLIST_TEMPLATES}
          onSelect={startChecklist}
          onCancel={() => setShowChecklist(false)}
        />
      )}
    </div>
  );
}

// Folder Form Component
function FolderForm({
  onSubmit,
  onCancel,
}: Readonly<{
  onSubmit: (data: Partial<OrganizationFolder>) => void;
  onCancel: () => void;
}>) {
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
            <label htmlFor="folder-name" className="block text-sm font-medium text-slate-700">Folder Name *</label>
            <input
              id="folder-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Science Notes"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-slate-700">Icon</legend>
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
          </fieldset>

          <fieldset>
            <legend className="block text-sm font-medium text-slate-700">Color</legend>
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
          </fieldset>

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
  onDeleteItem,
  onDeleteFolder,
  onClose,
}: Readonly<{
  folder: OrganizationFolder;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteFolder: () => void;
  onClose: () => void;
}>) {
  const [searchItems, setSearchItems] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'note' | 'file' | 'link' | 'task'>('all');

  const filteredItems = folder.items.filter((item) => {
    const matchesSearch =
      !searchItems ||
      item.title.toLowerCase().includes(searchItems.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchItems.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{folder.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{folder.name}</h2>
              <p className="mt-1 text-slate-600">{folder.items.length} items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDeleteFolder}
              className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
            >
              Delete Folder
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-6">
          {/* Search and Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchItems}
                onChange={(e) => setSearchItems(e.target.value)}
                placeholder="Search items..."
                className="w-full rounded-lg border-2 border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="note">Notes</option>
              <option value="file">Files</option>
              <option value="link">Links</option>
              <option value="task">Tasks</option>
            </select>
            <button
              onClick={onAddItem}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add Item
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-600">
                {folder.items.length === 0
                  ? 'No items in this folder yet'
                  : 'No items match your search'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="group rounded-lg border-2 border-slate-200 p-4 transition hover:border-slate-300">
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
                        <p className="mt-1 text-sm text-slate-600 line-clamp-3">{item.content}</p>
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
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="text-xs text-red-500 opacity-0 transition hover:text-red-700 group-hover:opacity-100"
                        >
                          Delete
                        </button>
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
}: Readonly<{
  folderId: string;
  onSubmit: (data: Partial<OrganizationItem>) => void;
  onCancel: () => void;
}>) {
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
            <label htmlFor="item-type" className="block text-sm font-medium text-slate-700">Type</label>
            <select
              id="item-type"
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
            <label htmlFor="item-title" className="block text-sm font-medium text-slate-700">Title *</label>
            <input
              id="item-title"
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
              <label htmlFor="item-content" className="block text-sm font-medium text-slate-700">Content</label>
              <textarea
                id="item-content"
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
              <label htmlFor="item-url" className="block text-sm font-medium text-slate-700">URL *</label>
              <input
                id="item-url"
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
            <label htmlFor="item-tags" className="block text-sm font-medium text-slate-700">
              Tags (comma-separated)
            </label>
            <input
              id="item-tags"
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

// Templates Modal Component
function TemplatesModal({
  templates,
  onSelect,
  onCancel,
}: Readonly<{
  templates: typeof FOLDER_TEMPLATES;
  onSelect: (template: typeof FOLDER_TEMPLATES[0]) => void;
  onCancel: () => void;
}>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Folder Templates</h2>
        <p className="mt-1 text-sm text-slate-600">
          Quickly create a set of related folders
        </p>

        <div className="mt-6 space-y-3">
          {templates.map((template) => (
            <button
              key={template.name}
              onClick={() => onSelect(template)}
              className="w-full rounded-lg border-2 border-slate-200 p-4 text-left transition hover:border-purple-500 hover:bg-purple-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{template.icon}</span>
                <div>
                  <div className="font-bold text-slate-900">{template.name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Creates: {template.folders.join(', ')}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="mt-6 w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Quick Note Modal Component
function QuickNoteModal({
  folders,
  onSubmit,
  onCancel,
}: Readonly<{
  folders: OrganizationFolder[];
  onSubmit: (folderId: string, noteData: Partial<OrganizationItem>) => void;
  onCancel: () => void;
}>) {
  const [selectedFolderId, setSelectedFolderId] = useState(folders[0]?.id || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFolderId || !title.trim()) return;

    onSubmit(selectedFolderId, {
      type: 'note',
      title: title.trim(),
      content: content.trim(),
      tags: [],
      createdAt: new Date().toISOString(),
    });
  }

  if (folders.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-slate-900">Quick Note</h2>
          <p className="mt-4 text-slate-600">
            You need to create a folder first before adding notes.
          </p>
          <button
            onClick={onCancel}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Quick Note</h2>
        <p className="mt-1 text-sm text-slate-600">
          Quickly jot down a note and save it to a folder
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="quick-note-folder" className="block text-sm font-medium text-slate-700">
              Save to Folder
            </label>
            <select
              id="quick-note-folder"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            >
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.icon} {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quick-note-title" className="block text-sm font-medium text-slate-700">
              Title *
            </label>
            <input
              id="quick-note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Note title"
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="quick-note-content" className="block text-sm font-medium text-slate-700">
              Content
            </label>
            <textarea
              id="quick-note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Write your note here..."
              className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
            >
              Save Note
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

// Checklist Modal Component
function ChecklistModal({
  templates,
  onSelect,
  onCancel,
}: Readonly<{
  templates: typeof CHECKLIST_TEMPLATES;
  onSelect: (template: typeof CHECKLIST_TEMPLATES[0]) => void;
  onCancel: () => void;
}>) {
  const [customName, setCustomName] = useState('');
  const [customItems, setCustomItems] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customName.trim() || !customItems.trim()) return;

    const items = customItems
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (items.length === 0) return;

    onSelect({
      name: customName.trim(),
      items,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Start a Checklist</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose a template or create your own
        </p>

        {!showCustom ? (
          <>
            <div className="mt-6 space-y-3">
              {templates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => onSelect(template)}
                  className="w-full rounded-lg border-2 border-slate-200 p-4 text-left transition hover:border-orange-500 hover:bg-orange-50"
                >
                  <div className="font-bold text-slate-900">{template.name}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    {template.items.length} items
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {template.items.slice(0, 3).map((item, index) => (
                      <span
                        key={`${template.name}-${index}`}
                        className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      >
                        {item.length > 20 ? item.slice(0, 20) + '...' : item}
                      </span>
                    ))}
                    {template.items.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{template.items.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCustom(true)}
              className="mt-4 w-full rounded-lg border-2 border-dashed border-slate-300 p-4 text-slate-600 transition hover:border-slate-400 hover:text-slate-700"
            >
              + Create Custom Checklist
            </button>
          </>
        ) : (
          <form onSubmit={handleCustomSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="checklist-name" className="block text-sm font-medium text-slate-700">
                Checklist Name *
              </label>
              <input
                id="checklist-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                placeholder="My Checklist"
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="checklist-items" className="block text-sm font-medium text-slate-700">
                Items (one per line) *
              </label>
              <textarea
                id="checklist-items"
                value={customItems}
                onChange={(e) => setCustomItems(e.target.value)}
                rows={6}
                required
                placeholder="Step 1&#10;Step 2&#10;Step 3"
                className="mt-1 w-full rounded-lg border-2 border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
              >
                Start Checklist
              </button>
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="flex-1 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          </form>
        )}

        <button
          onClick={onCancel}
          className="mt-4 w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
