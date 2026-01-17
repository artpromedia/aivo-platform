'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MindMap,
  MindMapNode,
  MindMapConnection,
  getMindMaps,
  getMindMap,
  createMindMap,
  updateMindMap,
  deleteMindMap,
  exportMindMap,
} from '@/lib/visual-learning-api';

export function MindMapping() {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<MindMap | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMindMaps();
  }, []);

  const loadMindMaps = async () => {
    try {
      const maps = await getMindMaps('user123');
      setMindMaps(maps);
    } catch (error) {
      console.error('Failed to load mind maps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMap = async (title: string, description: string) => {
    try {
      const newMap = await createMindMap({
        userId: 'user123',
        title,
        description,
        theme: 'colorful',
      });
      setMindMaps([newMap, ...mindMaps]);
      setSelectedMap(newMap);
      setIsCreating(false);
      setIsEditing(true);
    } catch (error) {
      console.error('Failed to create mind map:', error);
    }
  };

  const handleSelectMap = async (mapId: string) => {
    try {
      const map = await getMindMap(mapId);
      setSelectedMap(map);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to load mind map:', error);
    }
  };

  const handleUpdateMap = async (updates: Partial<MindMap>) => {
    if (!selectedMap) return;
    try {
      const updated = await updateMindMap(selectedMap.id, updates);
      setSelectedMap(updated);
      setMindMaps(mindMaps.map((m) => (m.id === updated.id ? updated : m)));
    } catch (error) {
      console.error('Failed to update mind map:', error);
    }
  };

  const handleDeleteMap = async (mapId: string) => {
    if (!confirm('Are you sure you want to delete this mind map?')) return;
    try {
      await deleteMindMap(mapId);
      setMindMaps(mindMaps.filter((m) => m.id !== mapId));
      if (selectedMap?.id === mapId) {
        setSelectedMap(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to delete mind map:', error);
    }
  };

  const handleExport = async (format: 'png' | 'pdf' | 'json') => {
    if (!selectedMap) return;
    try {
      const blob = await exportMindMap(selectedMap.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedMap.title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export mind map:', error);
    }
  };

  const addNode = (parentId: string | null = null) => {
    if (!selectedMap) return;
    
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      label: 'New Node',
      color: '#60a5fa',
      x: parentId ? selectedMap.nodes.find((n) => n.id === parentId)?.x || 400 : 400,
      y: parentId ? (selectedMap.nodes.find((n) => n.id === parentId)?.y || 300) + 100 : 300,
      parentId,
    };

    const updatedNodes = [...selectedMap.nodes, newNode];
    const updatedConnections = parentId
      ? [
          ...selectedMap.connections,
          {
            id: `conn-${Date.now()}`,
            sourceId: parentId,
            targetId: newNode.id,
            style: 'solid' as const,
          },
        ]
      : selectedMap.connections;

    handleUpdateMap({ nodes: updatedNodes, connections: updatedConnections });
  };

  const updateNode = (nodeId: string, updates: Partial<MindMapNode>) => {
    if (!selectedMap) return;
    const updatedNodes = selectedMap.nodes.map((node) =>
      node.id === nodeId ? { ...node, ...updates } : node
    );
    handleUpdateMap({ nodes: updatedNodes });
  };

  const deleteNode = (nodeId: string) => {
    if (!selectedMap) return;
    const updatedNodes = selectedMap.nodes.filter((node) => node.id !== nodeId && node.parentId !== nodeId);
    const updatedConnections = selectedMap.connections.filter(
      (conn) => conn.sourceId !== nodeId && conn.targetId !== nodeId
    );
    handleUpdateMap({ nodes: updatedNodes, connections: updatedConnections });
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
            <h2 className="text-lg font-semibold">My Mind Maps</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              New Map
            </button>
          </div>

          <div className="space-y-2">
            {mindMaps.map((map) => (
              <div
                key={map.id}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedMap?.id === map.id
                    ? 'bg-indigo-50 border-2 border-indigo-600'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleSelectMap(map.id)}
              >
                <h3 className="font-medium text-sm">{map.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{map.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{map.nodes.length} nodes</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMap(map.id);
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
            <h3 className="text-lg font-semibold mb-4">Create New Mind Map</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateMap(
                  formData.get('title') as string,
                  formData.get('description') as string
                );
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Create Map
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

        {selectedMap ? (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Toolbar */}
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedMap.title}</h2>
                <p className="text-sm text-gray-600">{selectedMap.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    isEditing
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {isEditing ? 'View Mode' : 'Edit Mode'}
                </button>
                <button
                  onClick={() => addNode()}
                  disabled={!isEditing}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Root Node
                </button>
                <div className="relative">
                  <button
                    onClick={() => handleExport('png')}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Export PNG
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div
              ref={canvasRef}
              className="relative bg-gray-50"
              style={{ height: '600px', overflow: 'auto' }}
            >
              <div className="relative min-w-full min-h-full p-8">
                {/* Render connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {selectedMap.connections.map((conn) => {
                    const source = selectedMap.nodes.find((n) => n.id === conn.sourceId);
                    const target = selectedMap.nodes.find((n) => n.id === conn.targetId);
                    if (!source || !target) return null;

                    return (
                      <line
                        key={conn.id}
                        x1={source.x + 75}
                        y1={source.y + 30}
                        x2={target.x + 75}
                        y2={target.y + 30}
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeDasharray={conn.style === 'dashed' ? '5,5' : undefined}
                      />
                    );
                  })}
                </svg>

                {/* Render nodes */}
                {selectedMap.nodes.map((node) => (
                  <div
                    key={node.id}
                    className="absolute"
                    style={{ left: node.x, top: node.y }}
                  >
                    <div
                      className="rounded-lg px-4 py-3 shadow-md min-w-[150px] text-center"
                      style={{ backgroundColor: node.color }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={node.label}
                          onChange={(e) => updateNode(node.id, { label: e.target.value })}
                          className="w-full bg-white bg-opacity-90 px-2 py-1 rounded text-sm text-center"
                        />
                      ) : (
                        <div className="text-white font-medium">{node.label}</div>
                      )}
                      {isEditing && (
                        <div className="flex items-center justify-center space-x-2 mt-2">
                          <button
                            onClick={() => addNode(node.id)}
                            className="text-xs bg-white bg-opacity-90 px-2 py-1 rounded hover:bg-opacity-100"
                          >
                            Add Child
                          </button>
                          <button
                            onClick={() => deleteNode(node.id)}
                            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  Nodes: {selectedMap.nodes.length} | Connections: {selectedMap.connections.length}
                </div>
                <div>
                  Last updated: {new Date(selectedMap.updatedAt).toLocaleDateString()}
                </div>
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
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Mind Map Selected</h3>
            <p className="mt-2 text-gray-600">
              Select a mind map from the sidebar or create a new one to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
