'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@aivo/ui-web';
import * as api from '@/lib/accessibility-api';

export function ResourceLibrary() {
  const confirm = useConfirm();
  const [resources, setResources] = useState<api.AccessibilityResource[]>([]);
  const [collections, setCollections] = useState<api.ResourceCollection[]>([]);
  const [selectedResource, setSelectedResource] = useState<api.AccessibilityResource | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<api.ResourceCollection | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<api.AccessibilityResource['category'] | 'all'>('all');
  const [filterType, setFilterType] = useState<api.AccessibilityResource['type'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [filterCategory, filterType]);

  const loadData = async () => {
    try {
      const filters: any = {};
      if (filterCategory !== 'all') filters.category = filterCategory;
      if (filterType !== 'all') filters.type = filterType;

      const [resourcesData, collectionsData] = await Promise.all([
        api.getResources(filters),
        api.getCollections('teacher123'),
      ]);
      setResources(resourcesData);
      setCollections(collectionsData);
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (
    title: string,
    category: api.AccessibilityResource['category'],
    type: api.AccessibilityResource['type'],
    description: string,
    content: string,
    url: string,
    subjects: string[],
    disabilities: string[],
    tags: string[]
  ) => {
    try {
      const resource = await api.createResource({
        title,
        category,
        type,
        description,
        content: content || undefined,
        url: url || undefined,
        gradeLevel: [],
        subjects,
        disabilities,
        tags,
        createdBy: 'teacher123',
      });
      setResources([...resources, resource]);
      setCreating(false);
    } catch (error) {
      console.error('Failed to create resource:', error);
    }
  };

  const handleCreateCollection = async (name: string, description: string, isPublic: boolean) => {
    try {
      const collection = await api.createCollection({
        name,
        description,
        teacherId: 'teacher123',
        resources: [],
        isPublic,
      });
      setCollections([...collections, collection]);
      setCreatingCollection(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const handleAddToCollection = async (collectionId: string, resourceId: string) => {
    try {
      const updated = await api.addToCollection(collectionId, resourceId);
      setCollections(collections.map((c) => (c.id === updated.id ? updated : c)));
    } catch (error) {
      console.error('Failed to add to collection:', error);
    }
  };

  const handleDeleteResource = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Resource',
      description: 'Delete this resource?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await api.deleteResource(id);
      setResources(resources.filter((r) => r.id !== id));
      setSelectedResource(null);
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  const filteredResources = resources.filter((r) =>
    searchQuery ? r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  r.description.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const getCategoryIcon = (category: api.AccessibilityResource['category']) => {
    const icons = {
      strategy: '💡',
      tool: '🔧',
      lesson: '📚',
      video: '🎥',
      article: '📄',
      template: '📋',
      checklist: '✅',
    };
    return icons[category];
  };

  const getTypeColor = (type: api.AccessibilityResource['type']) => {
    const colors = {
      visual: 'bg-blue-100 text-blue-700',
      auditory: 'bg-purple-100 text-purple-700',
      physical: 'bg-green-100 text-green-700',
      cognitive: 'bg-yellow-100 text-yellow-700',
      behavioral: 'bg-pink-100 text-pink-700',
      general: 'bg-slate-100 text-slate-700',
    };
    return colors[type];
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (selectedCollection) {
    const collectionResources = resources.filter((r) => selectedCollection.resources.includes(r.id));

    return (
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => setSelectedCollection(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Library
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{selectedCollection.name}</h2>
              <p className="mt-1 text-slate-600">{selectedCollection.description}</p>
              <div className="mt-2 flex gap-2">
                <span className="text-sm text-slate-500">
                  {selectedCollection.resources.length} resources
                </span>
                {selectedCollection.isPublic && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    Public
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {collectionResources.map((resource) => (
              <div
                key={resource.id}
                onClick={() => setSelectedResource(resource)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-4 hover:border-indigo-300"
              >
                <div className="mb-2 flex items-start gap-3">
                  <span className="text-2xl">{getCategoryIcon(resource.category)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{resource.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate-600">{resource.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(resource.type)}`}>
                    {resource.type}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                    ⭐ {resource.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {collectionResources.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No resources in this collection yet
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedResource) {
    return (
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => setSelectedResource(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Resources
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-3xl">{getCategoryIcon(selectedResource.category)}</span>
                <h2 className="text-2xl font-bold text-slate-900">{selectedResource.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getTypeColor(selectedResource.type)}`}>
                  {selectedResource.type}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {selectedResource.category}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  ⭐ {selectedResource.rating.toFixed(1)}
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {selectedResource.downloads} downloads
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteResource(selectedResource.id)}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>

          <div className="mb-6">
            <h3 className="mb-2 font-semibold text-slate-900">Description</h3>
            <p className="text-slate-700">{selectedResource.description}</p>
          </div>

          {selectedResource.content && (
            <div className="mb-6">
              <h3 className="mb-2 font-semibold text-slate-900">Content</h3>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700">
                {selectedResource.content}
              </div>
            </div>
          )}

          {selectedResource.url && (
            <div className="mb-6">
              <a
                href={selectedResource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                🔗 Open Resource
              </a>
            </div>
          )}

          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-slate-900">Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {selectedResource.subjects.map((subject) => (
                  <span key={subject} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-900">Applicable Disabilities</h3>
              <div className="flex flex-wrap gap-2">
                {selectedResource.disabilities.map((disability) => (
                  <span key={disability} className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                    {disability}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-2 font-semibold text-slate-900">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {selectedResource.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Add to Collection</h3>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddToCollection(e.target.value, selectedResource.id);
                }
              }}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              <option value="">Select a collection...</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Resource Library</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCreatingCollection(true)}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
          >
            + New Collection
          </button>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
          >
            + New Resource
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as any)}
          className="rounded-lg border border-slate-300 px-4 py-2"
        >
          <option value="all">All Categories</option>
          <option value="strategy">Strategy</option>
          <option value="tool">Tool</option>
          <option value="lesson">Lesson</option>
          <option value="video">Video</option>
          <option value="article">Article</option>
          <option value="template">Template</option>
          <option value="checklist">Checklist</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="rounded-lg border border-slate-300 px-4 py-2"
        >
          <option value="all">All Types</option>
          <option value="visual">Visual</option>
          <option value="auditory">Auditory</option>
          <option value="physical">Physical</option>
          <option value="cognitive">Cognitive</option>
          <option value="behavioral">Behavioral</option>
          <option value="general">General</option>
        </select>
      </div>

      {creatingCollection && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Create Collection</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateCollection(
                formData.get('name') as string,
                formData.get('description') as string,
                formData.get('isPublic') === 'true'
              );
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Collection Name</label>
              <input type="text" name="name" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea name="description" required rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isPublic" value="true" className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm text-slate-700">Make collection public</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700">
                Create
              </button>
              <button type="button" onClick={() => setCreatingCollection(false)} className="rounded-lg bg-slate-200 px-6 py-2 font-medium text-slate-700 hover:bg-slate-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {creating && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Create Resource</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const subjects = (formData.get('subjects') as string).split(',').map(s => s.trim()).filter(Boolean);
              const disabilities = (formData.get('disabilities') as string).split(',').map(d => d.trim()).filter(Boolean);
              const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean);
              handleCreate(
                formData.get('title') as string,
                formData.get('category') as api.AccessibilityResource['category'],
                formData.get('type') as api.AccessibilityResource['type'],
                formData.get('description') as string,
                formData.get('content') as string,
                formData.get('url') as string,
                subjects,
                disabilities,
                tags
              );
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <input type="text" name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select name="category" required className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="strategy">Strategy</option>
                  <option value="tool">Tool</option>
                  <option value="lesson">Lesson</option>
                  <option value="video">Video</option>
                  <option value="article">Article</option>
                  <option value="template">Template</option>
                  <option value="checklist">Checklist</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                <select name="type" required className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="visual">Visual</option>
                  <option value="auditory">Auditory</option>
                  <option value="physical">Physical</option>
                  <option value="cognitive">Cognitive</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea name="description" required rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Content (optional)</label>
              <textarea name="content" rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">URL (optional)</label>
              <input type="url" name="url" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Subjects (comma-separated)</label>
              <input type="text" name="subjects" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Applicable Disabilities (comma-separated)</label>
              <input type="text" name="disabilities" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tags (comma-separated)</label>
              <input type="text" name="tags" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700">
                Create
              </button>
              <button type="button" onClick={() => setCreating(false)} className="rounded-lg bg-slate-200 px-6 py-2 font-medium text-slate-700 hover:bg-slate-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">My Collections</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {collections.map((collection) => (
              <div
                key={collection.id}
                onClick={() => setSelectedCollection(collection)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md"
              >
                <h4 className="mb-1 font-semibold text-slate-900">{collection.name}</h4>
                <p className="mb-2 line-clamp-2 text-sm text-slate-600">{collection.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{collection.resources.length} resources</span>
                  {collection.isPublic && (
                    <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-700">
                      Public
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">All Resources</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <div
              key={resource.id}
              onClick={() => setSelectedResource(resource)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-start gap-3">
                <span className="text-2xl">{getCategoryIcon(resource.category)}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{resource.title}</h3>
                  <p className="line-clamp-2 text-sm text-slate-600">{resource.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(resource.type)}`}>
                  {resource.type}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                  ⭐ {resource.rating.toFixed(1)}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {resource.downloads} downloads
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filteredResources.length === 0 && !creating && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600">No resources found. Create one or adjust your filters!</p>
        </div>
      )}
    </div>
  );
}
