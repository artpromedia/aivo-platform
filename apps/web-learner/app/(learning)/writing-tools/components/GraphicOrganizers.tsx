'use client';

import { useState, useEffect } from 'react';
import {
  GraphicOrganizer,
  SavedOrganizer,
  OrganizerContent,
  getGraphicOrganizers,
  saveOrganizerContent,
  getSavedOrganizers,
  exportOrganizer,
} from '@/lib/writing-api';

interface GraphicOrganizersProps {
  learnerId: string;
}

/**
 * Graphic Organizers component
 * Provides interactive visual tools for organizing thoughts and ideas
 */
export function GraphicOrganizers({ learnerId }: Readonly<GraphicOrganizersProps>) {
  const [organizers, setOrganizers] = useState<GraphicOrganizer[]>([]);
  const [savedOrganizers, setSavedOrganizers] = useState<SavedOrganizer[]>([]);
  const [selectedOrganizer, setSelectedOrganizer] = useState<GraphicOrganizer | null>(null);
  const [content, setContent] = useState<OrganizerContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    loadOrganizers();
    loadSavedOrganizers();
  }, [learnerId]);

  async function loadOrganizers() {
    try {
      setLoading(true);
      const data = await getGraphicOrganizers();
      setOrganizers(data);
    } catch (err) {
      setError('Failed to load graphic organizers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSavedOrganizers() {
    try {
      const data = await getSavedOrganizers(learnerId);
      setSavedOrganizers(data);
    } catch (err) {
      console.error('Failed to load saved organizers:', err);
    }
  }

  function selectOrganizer(organizer: GraphicOrganizer) {
    setSelectedOrganizer(organizer);
    setContent(initializeContent(organizer));
    setShowSaved(false);
  }

  function loadSavedOrganizer(saved: SavedOrganizer) {
    const organizer = organizers.find((o) => o.id === saved.organizerId);
    if (organizer) {
      setSelectedOrganizer(organizer);
      setContent(saved.content);
      setShowSaved(false);
    }
  }

  function initializeContent(organizer: GraphicOrganizer): OrganizerContent {
    const baseContent = {
      organizerId: organizer.id,
      title: '',
      createdAt: new Date().toISOString(),
    };

    switch (organizer.type) {
      case 'web':
        return { ...baseContent, centerTopic: '', connections: [] };
      case 'venn':
        return { ...baseContent, leftCircle: '', rightCircle: '', overlap: '', leftItems: [], rightItems: [], overlapItems: [] };
      case 'sequence':
        return { ...baseContent, steps: [] };
      case 'compare-contrast':
        return { ...baseContent, subject1: '', subject2: '', similarities: [], differences: [] };
      case 'cause-effect':
        return { ...baseContent, causes: [], effects: [] };
      case 'kwl':
        return { ...baseContent, know: [], want: [], learned: [] };
      case 'story-map':
        return { ...baseContent, title: '', characters: [], setting: '', problem: '', events: [], solution: '' };
      case 'outline':
        return { ...baseContent, mainIdea: '', points: [] };
      default:
        return baseContent;
    }
  }

  async function handleSave() {
    if (!selectedOrganizer || !content) return;

    try {
      setSaving(true);
      await saveOrganizerContent(learnerId, content);
      await loadSavedOrganizers();
      setError(null);
    } catch (err) {
      setError('Failed to save organizer');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(format: 'pdf' | 'image') {
    if (!selectedOrganizer || !content) return;

    try {
      const blob = await exportOrganizer(learnerId, content, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${content.title || 'organizer'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to export as ${format}`);
      console.error(err);
    }
  }

  function renderOrganizerEditor() {
    if (!selectedOrganizer || !content) return null;

    switch (selectedOrganizer.type) {
      case 'web':
        return renderWebEditor();
      case 'venn':
        return renderVennEditor();
      case 'sequence':
        return renderSequenceEditor();
      case 'compare-contrast':
        return renderCompareContrastEditor();
      case 'cause-effect':
        return renderCauseEffectEditor();
      case 'kwl':
        return renderKWLEditor();
      case 'story-map':
        return renderStoryMapEditor();
      case 'outline':
        return renderOutlineEditor();
      default:
        return <div>Unsupported organizer type</div>;
    }
  }

  function renderWebEditor() {
    if (!content || !('centerTopic' in content)) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Center Topic</label>
          <input
            type="text"
            value={content.centerTopic || ''}
            onChange={(e) => setContent({ ...content, centerTopic: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            placeholder="Main idea or topic"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Connections</label>
          {(content.connections || []).map((conn, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={conn}
                onChange={(e) => {
                  const newConnections = [...(content.connections || [])];
                  newConnections[idx] = e.target.value;
                  setContent({ ...content, connections: newConnections });
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                placeholder={`Connection ${idx + 1}`}
              />
              <button
                onClick={() => {
                  const newConnections = (content.connections || []).filter((_, i) => i !== idx);
                  setContent({ ...content, connections: newConnections });
                }}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setContent({ ...content, connections: [...(content.connections || []), ''] })}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
          >
            Add Connection
          </button>
        </div>
      </div>
    );
  }

  function renderVennEditor() {
    if (!content || !('leftCircle' in content)) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Left Circle Label</label>
            <input
              type="text"
              value={content.leftCircle || ''}
              onChange={(e) => setContent({ ...content, leftCircle: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Right Circle Label</label>
            <input
              type="text"
              value={content.rightCircle || ''}
              onChange={(e) => setContent({ ...content, rightCircle: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Overlap Label</label>
          <input
            type="text"
            value={content.overlap || ''}
            onChange={(e) => setContent({ ...content, overlap: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Left Items</label>
            <textarea
              value={(content.leftItems || []).join('\n')}
              onChange={(e) => setContent({ ...content, leftItems: e.target.value.split('\n') })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={5}
              placeholder="One item per line"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Overlap Items</label>
            <textarea
              value={(content.overlapItems || []).join('\n')}
              onChange={(e) => setContent({ ...content, overlapItems: e.target.value.split('\n') })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={5}
              placeholder="One item per line"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Right Items</label>
            <textarea
              value={(content.rightItems || []).join('\n')}
              onChange={(e) => setContent({ ...content, rightItems: e.target.value.split('\n') })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              rows={5}
              placeholder="One item per line"
            />
          </div>
        </div>
      </div>
    );
  }

  function renderSequenceEditor() {
    if (!content || !('steps' in content)) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Steps/Events</label>
          {(content.steps || []).map((step, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <span className="px-3 py-2 bg-slate-100 rounded-md font-medium">{idx + 1}</span>
              <input
                type="text"
                value={step}
                onChange={(e) => {
                  const newSteps = [...(content.steps || [])];
                  newSteps[idx] = e.target.value;
                  setContent({ ...content, steps: newSteps });
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                placeholder={`Step ${idx + 1}`}
              />
              <button
                onClick={() => {
                  const newSteps = (content.steps || []).filter((_, i) => i !== idx);
                  setContent({ ...content, steps: newSteps });
                }}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setContent({ ...content, steps: [...(content.steps || []), ''] })}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
          >
            Add Step
          </button>
        </div>
      </div>
    );
  }

  function renderCompareContrastEditor() {
    if (!content || !('subject1' in content)) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject 1</label>
            <input
              type="text"
              value={content.subject1 || ''}
              onChange={(e) => setContent({ ...content, subject1: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject 2</label>
            <input
              type="text"
              value={content.subject2 || ''}
              onChange={(e) => setContent({ ...content, subject2: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Similarities</label>
          <textarea
            value={(content.similarities || []).join('\n')}
            onChange={(e) => setContent({ ...content, similarities: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={4}
            placeholder="One similarity per line"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Differences</label>
          <textarea
            value={(content.differences || []).join('\n')}
            onChange={(e) => setContent({ ...content, differences: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={4}
            placeholder="One difference per line"
          />
        </div>
      </div>
    );
  }

  function renderCauseEffectEditor() {
    if (!content || !('causes' in content)) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Causes</label>
          <textarea
            value={(content.causes || []).join('\n')}
            onChange={(e) => setContent({ ...content, causes: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={5}
            placeholder="One cause per line"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Effects</label>
          <textarea
            value={(content.effects || []).join('\n')}
            onChange={(e) => setContent({ ...content, effects: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={5}
            placeholder="One effect per line"
          />
        </div>
      </div>
    );
  }

  function renderKWLEditor() {
    if (!content || !('know' in content)) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">What I Know</label>
          <textarea
            value={(content.know || []).join('\n')}
            onChange={(e) => setContent({ ...content, know: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={4}
            placeholder="One item per line"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">What I Want to Learn</label>
          <textarea
            value={(content.want || []).join('\n')}
            onChange={(e) => setContent({ ...content, want: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={4}
            placeholder="One item per line"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">What I Learned</label>
          <textarea
            value={(content.learned || []).join('\n')}
            onChange={(e) => setContent({ ...content, learned: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={4}
            placeholder="One item per line"
          />
        </div>
      </div>
    );
  }

  function renderStoryMapEditor() {
    if (!content || !('characters' in content)) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={content.title || ''}
            onChange={(e) => setContent({ ...content, title: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Characters</label>
          <textarea
            value={(content.characters || []).join('\n')}
            onChange={(e) => setContent({ ...content, characters: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={3}
            placeholder="One character per line"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Setting</label>
          <input
            type="text"
            value={content.setting || ''}
            onChange={(e) => setContent({ ...content, setting: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Problem</label>
          <textarea
            value={content.problem || ''}
            onChange={(e) => setContent({ ...content, problem: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Events</label>
          <textarea
            value={(content.events || []).join('\n')}
            onChange={(e) => setContent({ ...content, events: e.target.value.split('\n') })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={4}
            placeholder="One event per line"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Solution</label>
          <textarea
            value={content.solution || ''}
            onChange={(e) => setContent({ ...content, solution: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            rows={2}
          />
        </div>
      </div>
    );
  }

  function renderOutlineEditor() {
    if (!content || !('mainIdea' in content)) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Main Idea</label>
          <input
            type="text"
            value={content.mainIdea || ''}
            onChange={(e) => setContent({ ...content, mainIdea: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Main Points</label>
          {(content.points || []).map((point, idx) => (
            <div key={idx} className="mb-4 p-3 border border-slate-200 rounded-md">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={point.main}
                  onChange={(e) => {
                    const newPoints = [...(content.points || [])];
                    newPoints[idx] = { ...point, main: e.target.value };
                    setContent({ ...content, points: newPoints });
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md font-medium"
                  placeholder={`Point ${idx + 1}`}
                />
                <button
                  onClick={() => {
                    const newPoints = (content.points || []).filter((_, i) => i !== idx);
                    setContent({ ...content, points: newPoints });
                  }}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
              <textarea
                value={point.supporting.join('\n')}
                onChange={(e) => {
                  const newPoints = [...(content.points || [])];
                  newPoints[idx] = { ...point, supporting: e.target.value.split('\n') };
                  setContent({ ...content, points: newPoints });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                rows={3}
                placeholder="Supporting details (one per line)"
              />
            </div>
          ))}
          <button
            onClick={() => setContent({ ...content, points: [...(content.points || []), { main: '', supporting: [] }] })}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
          >
            Add Point
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading graphic organizers...</div>;
  }

  if (error && !selectedOrganizer) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  return (
    <div>
      {!selectedOrganizer ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Select an Organizer</h3>
            {savedOrganizers.length > 0 && (
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
              >
                {showSaved ? 'Show Templates' : 'Show Saved'}
              </button>
            )}
          </div>

          {showSaved ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedOrganizers.map((saved) => (
                <button
                  key={saved.id}
                  onClick={() => loadSavedOrganizer(saved)}
                  className="p-4 border border-slate-200 rounded-lg text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <h4 className="font-medium mb-1">{saved.content.title || 'Untitled'}</h4>
                  <p className="text-sm text-slate-600 mb-2">
                    {organizers.find((o) => o.id === saved.organizerId)?.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(saved.lastModified).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizers.map((organizer) => (
                <button
                  key={organizer.id}
                  onClick={() => selectOrganizer(organizer)}
                  className="p-4 border border-slate-200 rounded-lg text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <h4 className="font-medium mb-1">{organizer.name}</h4>
                  <p className="text-sm text-slate-600">{organizer.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedOrganizer.name}</h3>
              <p className="text-sm text-slate-600">{selectedOrganizer.description}</p>
            </div>
            <button
              onClick={() => {
                setSelectedOrganizer(null);
                setContent(null);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
            >
              Back to Selection
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Organizer Title</label>
            <input
              type="text"
              value={content?.title || ''}
              onChange={(e) => content && setContent({ ...content, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
              placeholder="Give your organizer a title"
            />
          </div>

          {renderOrganizerEditor()}

          {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              Export as PDF
            </button>
            <button
              onClick={() => handleExport('image')}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              Export as Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
