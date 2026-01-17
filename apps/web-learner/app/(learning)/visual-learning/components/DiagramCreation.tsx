'use client';

import { useState, useEffect } from 'react';
import {
  Diagram,
  DiagramShape,
  getDiagrams,
  getDiagram,
  createDiagram,
  updateDiagram,
  deleteDiagram,
  exportDiagram,
} from '@/lib/visual-learning-api';

const SHAPE_TYPES = ['rectangle', 'circle', 'triangle', 'diamond', 'arrow', 'text'] as const;
const DIAGRAM_TYPES = ['flowchart', 'sequence', 'class', 'entity-relationship', 'network', 'custom'] as const;

export function DiagramCreation() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedShape, setSelectedShape] = useState<DiagramShape | null>(null);
  const [selectedTool, setSelectedTool] = useState<typeof SHAPE_TYPES[number] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiagrams();
  }, []);

  const loadDiagrams = async () => {
    try {
      const diags = await getDiagrams('user123');
      setDiagrams(diags);
    } catch (error) {
      console.error('Failed to load diagrams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiagram = async (title: string, description: string, type: string) => {
    try {
      const newDiagram = await createDiagram({
        userId: 'user123',
        title,
        description,
        type,
      });
      setDiagrams([newDiagram, ...diagrams]);
      setSelectedDiagram(newDiagram);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create diagram:', error);
    }
  };

  const handleSelectDiagram = async (diagramId: string) => {
    try {
      const diagram = await getDiagram(diagramId);
      setSelectedDiagram(diagram);
    } catch (error) {
      console.error('Failed to load diagram:', error);
    }
  };

  const handleUpdateDiagram = async (updates: Partial<Diagram>) => {
    if (!selectedDiagram) return;
    try {
      const updated = await updateDiagram(selectedDiagram.id, updates);
      setSelectedDiagram(updated);
      setDiagrams(diagrams.map((d) => (d.id === updated.id ? updated : d)));
    } catch (error) {
      console.error('Failed to update diagram:', error);
    }
  };

  const handleDeleteDiagram = async (diagramId: string) => {
    if (!confirm('Are you sure you want to delete this diagram?')) return;
    try {
      await deleteDiagram(diagramId);
      setDiagrams(diagrams.filter((d) => d.id !== diagramId));
      if (selectedDiagram?.id === diagramId) {
        setSelectedDiagram(null);
      }
    } catch (error) {
      console.error('Failed to delete diagram:', error);
    }
  };

  const handleExport = async (format: 'png' | 'svg' | 'pdf') => {
    if (!selectedDiagram) return;
    try {
      const blob = await exportDiagram(selectedDiagram.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDiagram.title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export diagram:', error);
    }
  };

  const addShape = (x: number, y: number) => {
    if (!selectedDiagram || !selectedTool) return;

    const newShape: DiagramShape = {
      id: `shape-${Date.now()}`,
      type: selectedTool,
      x,
      y,
      width: selectedTool === 'circle' ? 100 : selectedTool === 'text' ? 200 : 120,
      height: selectedTool === 'circle' ? 100 : selectedTool === 'text' ? 40 : 80,
      fill: selectedTool === 'text' ? 'transparent' : '#e0e7ff',
      stroke: '#4f46e5',
      strokeWidth: 2,
      text: selectedTool === 'text' ? 'Text' : '',
      fontSize: 14,
      rotation: 0,
    };

    handleUpdateDiagram({ shapes: [...selectedDiagram.shapes, newShape] });
    setSelectedTool(null);
  };

  const updateShape = (shapeId: string, updates: Partial<DiagramShape>) => {
    if (!selectedDiagram) return;
    const updatedShapes = selectedDiagram.shapes.map((shape) =>
      shape.id === shapeId ? { ...shape, ...updates } : shape
    );
    handleUpdateDiagram({ shapes: updatedShapes });
  };

  const deleteShape = (shapeId: string) => {
    if (!selectedDiagram) return;
    const updatedShapes = selectedDiagram.shapes.filter((shape) => shape.id !== shapeId);
    const updatedConnectors = selectedDiagram.connectors.filter(
      (conn) => conn.sourceId !== shapeId && conn.targetId !== shapeId
    );
    handleUpdateDiagram({ shapes: updatedShapes, connectors: updatedConnectors });
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
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Diagrams</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              New
            </button>
          </div>

          <div className="space-y-2">
            {diagrams.map((diagram) => (
              <div
                key={diagram.id}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedDiagram?.id === diagram.id
                    ? 'bg-indigo-50 border-2 border-indigo-600'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleSelectDiagram(diagram.id)}
              >
                <h3 className="font-medium text-sm">{diagram.title}</h3>
                <p className="text-xs text-gray-600 mt-1 capitalize">{diagram.type}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{diagram.shapes.length} shapes</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDiagram(diagram.id);
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

        {/* Tools */}
        {selectedDiagram && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-semibold mb-3">Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              {SHAPE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedTool(type)}
                  className={`p-3 rounded-md text-sm capitalize transition-colors ${
                    selectedTool === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {selectedTool && (
              <p className="mt-3 text-xs text-gray-600">Click on canvas to add {selectedTool}</p>
            )}
          </div>
        )}
      </div>

      {/* Main Area */}
      <div className="lg:col-span-3">
        {isCreating && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New Diagram</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateDiagram(
                  formData.get('title') as string,
                  formData.get('description') as string,
                  formData.get('type') as string
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    name="type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {DIAGRAM_TYPES.map((type) => (
                      <option key={type} value={type} className="capitalize">
                        {type.replace('-', ' ')}
                      </option>
                    ))}
                  </select>
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

        {selectedDiagram ? (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Toolbar */}
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedDiagram.title}</h2>
                <p className="text-sm text-gray-600 capitalize">{selectedDiagram.type}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExport('png')}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Export PNG
                </button>
                <button
                  onClick={() => handleExport('svg')}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Export SVG
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div
              className="relative bg-gray-50"
              style={{
                height: '600px',
                width: '100%',
                backgroundImage: selectedDiagram.canvas.gridEnabled
                  ? 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)'
                  : undefined,
                backgroundSize: selectedDiagram.canvas.gridEnabled ? '20px 20px' : undefined,
              }}
              onClick={(e) => {
                if (selectedTool) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  addShape(x, y);
                }
              }}
            >
              {/* Render shapes */}
              {selectedDiagram.shapes.map((shape) => (
                <div
                  key={shape.id}
                  className="absolute cursor-pointer group"
                  style={{
                    left: shape.x,
                    top: shape.y,
                    width: shape.width,
                    height: shape.height,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShape(shape);
                  }}
                >
                  {shape.type === 'rectangle' && (
                    <div
                      className="w-full h-full border-2 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: shape.fill,
                        borderColor: shape.stroke,
                        borderWidth: shape.strokeWidth,
                      }}
                    >
                      {shape.text && (
                        <input
                          type="text"
                          value={shape.text}
                          onChange={(e) => updateShape(shape.id, { text: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full h-full bg-transparent text-center px-2"
                          style={{ fontSize: shape.fontSize }}
                        />
                      )}
                    </div>
                  )}
                  {shape.type === 'circle' && (
                    <div
                      className="w-full h-full border-2 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: shape.fill,
                        borderColor: shape.stroke,
                        borderWidth: shape.strokeWidth,
                      }}
                    >
                      {shape.text && (
                        <input
                          type="text"
                          value={shape.text}
                          onChange={(e) => updateShape(shape.id, { text: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full h-full bg-transparent text-center px-2"
                          style={{ fontSize: shape.fontSize }}
                        />
                      )}
                    </div>
                  )}
                  {shape.type === 'text' && (
                    <input
                      type="text"
                      value={shape.text || ''}
                      onChange={(e) => updateShape(shape.id, { text: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-full bg-transparent border-b-2 border-gray-300 px-2"
                      style={{ fontSize: shape.fontSize }}
                    />
                  )}
                  {/* Delete button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteShape(shape.id);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Properties Panel */}
            {selectedShape && (
              <div className="border-t p-4 bg-gray-50">
                <h3 className="text-sm font-semibold mb-3">Shape Properties</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Fill Color</label>
                    <input
                      type="color"
                      value={selectedShape.fill}
                      onChange={(e) => updateShape(selectedShape.id, { fill: e.target.value })}
                      className="w-full h-8 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Stroke Color</label>
                    <input
                      type="color"
                      value={selectedShape.stroke}
                      onChange={(e) => updateShape(selectedShape.id, { stroke: e.target.value })}
                      className="w-full h-8 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Stroke Width</label>
                    <input
                      type="number"
                      value={selectedShape.strokeWidth}
                      onChange={(e) =>
                        updateShape(selectedShape.id, { strokeWidth: Number(e.target.value) })
                      }
                      min="1"
                      max="10"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Font Size</label>
                    <input
                      type="number"
                      value={selectedShape.fontSize || 14}
                      onChange={(e) =>
                        updateShape(selectedShape.id, { fontSize: Number(e.target.value) })
                      }
                      min="8"
                      max="32"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
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
                d="M4 5a1 1 0 011-1h4a1 1 0 010 2H6v2a1 1 0 01-2 0V5zM4 13a1 1 0 011-1h2a1 1 0 110 2H5a1 1 0 01-1-1zm6-4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm6 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Diagram Selected</h3>
            <p className="mt-2 text-gray-600">
              Select a diagram from the sidebar or create a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
