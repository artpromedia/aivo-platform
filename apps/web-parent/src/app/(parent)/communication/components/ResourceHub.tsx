'use client';

import { useEffect, useState } from 'react';
import {
  getResources,
  getRecommendedResources,
  getResourceCollections,
  createCollection,
  addToCollection,
  removeFromCollection,
  ParentResource,
  ResourceCategory,
  ResourceCollection,
} from '@/lib/parent-communication-api';

export function ResourceHub() {
  const [resources, setResources] = useState<ParentResource[]>([]);
  const [collections, setCollections] = useState<ResourceCollection[]>([]);
  const [selectedResource, setSelectedResource] = useState<ParentResource | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecommended, setShowRecommended] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [loading, setLoading] = useState(true);

  const parentId = 'parent-1';
  const selectedStudent = 'student-1';

  useEffect(() => {
    loadResources();
    loadCollections();
  }, [categoryFilter, showRecommended]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const data = showRecommended
        ? await getRecommendedResources(selectedStudent)
        : await getResources({
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            search: searchQuery || undefined,
            recommended: undefined,
          });
      setResources(data);
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const data = await getResourceCollections(parentId);
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const handleSearch = () => {
    loadResources();
  };

  const handleAddToCollection = async (collectionId: string, resourceId: string) => {
    try {
      await addToCollection(collectionId, resourceId);
      loadCollections();
    } catch (error) {
      console.error('Failed to add to collection:', error);
    }
  };

  const handleCreateCollection = async () => {
    const name = prompt('Enter collection name:');
    if (!name) return;

    try {
      await createCollection({
        name,
        description: '',
        parentId,
        isPublic: false,
      });
      loadCollections();
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
  };

  const getCategoryIcon = (category: ResourceCategory) => {
    switch (category) {
      case 'article':
        return '📄';
      case 'video':
        return '🎥';
      case 'activity':
        return '🎯';
      case 'guide':
        return '📖';
      case 'tool':
        return '🔧';
      case 'book':
        return '📚';
    }
  };

  const filteredResources = resources.filter((resource) =>
    searchQuery
      ? resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading resources...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCollections(false)}
            className={`px-4 py-2 font-medium ${
              !showCollections
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            📚 Browse Resources
          </button>
          <button
            onClick={() => setShowCollections(true)}
            className={`px-4 py-2 font-medium ${
              showCollections
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            ⭐ My Collections
          </button>
        </div>
      </div>

      {!showCollections ? (
        <>
          {/* Filters & Search */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search resources..."
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ResourceCategory | 'all')}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700"
            >
              <option value="all">All Categories</option>
              <option value="article">Articles</option>
              <option value="video">Videos</option>
              <option value="activity">Activities</option>
              <option value="guide">Guides</option>
              <option value="tool">Tools</option>
              <option value="book">Books</option>
            </select>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showRecommended}
                onChange={(e) => setShowRecommended(e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="font-medium text-gray-700">Recommended for your child</span>
            </label>
          </div>

          {/* Resources Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-500">
                No resources found
              </div>
            ) : (
              filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex flex-col rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg"
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 overflow-hidden rounded-t-lg bg-gray-100">
                    {resource.thumbnail ? (
                      <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-6xl">
                        {getCategoryIcon(resource.category)}
                      </div>
                    )}
                    {resource.recommended && (
                      <div className="absolute right-2 top-2 rounded-full bg-yellow-400 px-2 py-1 text-xs font-medium text-yellow-900">
                        ⭐ Recommended
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="flex-1 font-semibold text-gray-900">{resource.title}</h3>
                      <span className="ml-2 text-xl">{getCategoryIcon(resource.category)}</span>
                    </div>

                    <p className="mb-4 flex-1 text-sm text-gray-600">{resource.description}</p>

                    {/* Metadata */}
                    <div className="mb-4 space-y-2 text-xs text-gray-500">
                      {resource.duration && (
                        <div className="flex items-center gap-1">
                          <span>⏱️</span>
                          <span>{resource.duration} min</span>
                        </div>
                      )}
                      {resource.ageRange && (
                        <div className="flex items-center gap-1">
                          <span>👥</span>
                          <span>{resource.ageRange.join(', ')}</span>
                        </div>
                      )}
                      {resource.difficulty && (
                        <div className="flex items-center gap-1">
                          <span>📊</span>
                          <span className="capitalize">{resource.difficulty}</span>
                        </div>
                      )}
                    </div>

                    {/* Topics */}
                    <div className="mb-4 flex flex-wrap gap-1">
                      {resource.topics.slice(0, 3).map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {topic}
                        </span>
                      ))}
                      {resource.topics.length > 3 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          +{resource.topics.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedResource(resource)}
                        className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        View Details
                      </button>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddToCollection(e.target.value, resource.id);
                            e.target.value = '';
                          }
                        }}
                        className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                      >
                        <option value="">+ Save</option>
                        {collections.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Resource Details Modal */}
          {selectedResource && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
              onClick={() => setSelectedResource(null)}
            >
              <div
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedResource.title}
                  </h2>
                  <button
                    onClick={() => setSelectedResource(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-4 text-sm text-gray-500">
                  {selectedResource.category} • {selectedResource.createdBy}
                </div>

                <p className="mb-6 text-gray-700">{selectedResource.description}</p>

                {selectedResource.content && (
                  <div className="mb-6 rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-2 font-semibold text-gray-900">Content</h3>
                    <p className="whitespace-pre-wrap text-gray-700">
                      {selectedResource.content}
                    </p>
                  </div>
                )}

                {selectedResource.url && (
                  <a
                    href={selectedResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-md bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    Access Resource →
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Collections View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">My Collections</h2>
            <button
              onClick={handleCreateCollection}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              + New Collection
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-500">
                No collections yet. Create one to organize your resources!
              </div>
            ) : (
              collections.map((collection) => (
                <div
                  key={collection.id}
                  className="rounded-lg border border-gray-200 bg-white p-6"
                >
                  <h3 className="mb-2 font-semibold text-gray-900">{collection.name}</h3>
                  <p className="mb-4 text-sm text-gray-600">{collection.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{collection.resources.length} resources</span>
                    <span>{collection.isPublic ? '🌐 Public' : '🔒 Private'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
