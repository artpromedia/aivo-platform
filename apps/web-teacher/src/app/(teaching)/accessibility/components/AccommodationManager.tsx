'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@aivo/ui-web';
import * as api from '@/lib/accessibility-api';

export function AccommodationManager() {
  const confirm = useConfirm();
  const [accommodations, setAccommodations] = useState<api.Accommodation[]>([]);
  const [templates, setTemplates] = useState<api.AccommodationTemplate[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('student123');
  const [creating, setCreating] = useState(false);
  const [selectedAccommodation, setSelectedAccommodation] = useState<api.Accommodation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<api.Accommodation['type'] | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<api.Accommodation['status'] | 'all'>('all');

  useEffect(() => {
    loadData();
  }, [selectedStudent]);

  const loadData = async () => {
    try {
      const [accommodationsData, templatesData] = await Promise.all([
        api.getAccommodations(selectedStudent),
        api.getAccommodationTemplates(),
      ]);
      setAccommodations(accommodationsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load accommodations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (
    type: api.Accommodation['type'],
    category: string,
    title: string,
    description: string,
    implementation: string,
    frequency: api.Accommodation['frequency']
  ) => {
    try {
      const accommodation = await api.createAccommodation({
        studentId: selectedStudent,
        type,
        category,
        title,
        description,
        implementation,
        frequency,
        status: 'trial',
        effectiveness: 3,
        startDate: new Date().toISOString().split('T')[0],
        createdBy: 'teacher123',
      });
      setAccommodations([...accommodations, accommodation]);
      setCreating(false);
    } catch (error) {
      console.error('Failed to create accommodation:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<api.Accommodation>) => {
    try {
      const updated = await api.updateAccommodation(id, data);
      setAccommodations(accommodations.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedAccommodation?.id === id) {
        setSelectedAccommodation(updated);
      }
    } catch (error) {
      console.error('Failed to update accommodation:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Accommodation',
      description: 'Delete this accommodation?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await api.deleteAccommodation(id);
      setAccommodations(accommodations.filter((a) => a.id !== id));
      setSelectedAccommodation(null);
    } catch (error) {
      console.error('Failed to delete accommodation:', error);
    }
  };

  const filteredAccommodations = accommodations.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const getTypeColor = (type: api.Accommodation['type']) => {
    const colors = {
      visual: 'bg-blue-100 text-blue-700',
      auditory: 'bg-purple-100 text-purple-700',
      physical: 'bg-green-100 text-green-700',
      cognitive: 'bg-yellow-100 text-yellow-700',
      behavioral: 'bg-pink-100 text-pink-700',
      testing: 'bg-indigo-100 text-indigo-700',
      other: 'bg-slate-100 text-slate-700',
    };
    return colors[type];
  };

  const getStatusBadge = (status: api.Accommodation['status']) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-slate-100 text-slate-700',
      trial: 'bg-blue-100 text-blue-700',
      discontinued: 'bg-red-100 text-red-700',
    };
    return badges[status];
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (selectedAccommodation) {
    return (
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => setSelectedAccommodation(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Accommodations
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{selectedAccommodation.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getTypeColor(selectedAccommodation.type)}`}>
                  {selectedAccommodation.type}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(selectedAccommodation.status)}`}>
                  {selectedAccommodation.status}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {selectedAccommodation.category}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDelete(selectedAccommodation.id)}
              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
              <p className="rounded border border-slate-200 bg-slate-50 p-3 text-slate-700">
                {selectedAccommodation.description}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Implementation</label>
              <p className="rounded border border-slate-200 bg-slate-50 p-3 text-slate-700">
                {selectedAccommodation.implementation}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Frequency</label>
                <select
                  value={selectedAccommodation.frequency}
                  onChange={(e) => handleUpdate(selectedAccommodation.id, { frequency: e.target.value as api.Accommodation['frequency'] })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="always">Always</option>
                  <option value="asNeeded">As Needed</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={selectedAccommodation.status}
                  onChange={(e) => handleUpdate(selectedAccommodation.id, { status: e.target.value as api.Accommodation['status'] })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Effectiveness: {selectedAccommodation.effectiveness}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={selectedAccommodation.effectiveness}
                onChange={(e) => handleUpdate(selectedAccommodation.id, { effectiveness: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>Not Effective</span>
                <span>Very Effective</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={selectedAccommodation.notes || ''}
                onChange={(e) => handleUpdate(selectedAccommodation.id, { notes: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Add notes about implementation or observations..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
                <p className="text-slate-900">{new Date(selectedAccommodation.startDate).toLocaleDateString()}</p>
              </div>
              {selectedAccommodation.reviewDate && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Review Date</label>
                  <p className="text-slate-900">{new Date(selectedAccommodation.reviewDate).toLocaleDateString()}</p>
                </div>
              )}
              {selectedAccommodation.endDate && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
                  <p className="text-slate-900">{new Date(selectedAccommodation.endDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Accommodation Manager</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          + New Accommodation
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
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
          <option value="testing">Testing</option>
          <option value="other">Other</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="rounded-lg border border-slate-300 px-4 py-2"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="inactive">Inactive</option>
          <option value="discontinued">Discontinued</option>
        </select>
      </div>

      {creating && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Create Accommodation</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreate(
                formData.get('type') as api.Accommodation['type'],
                formData.get('category') as string,
                formData.get('title') as string,
                formData.get('description') as string,
                formData.get('implementation') as string,
                formData.get('frequency') as api.Accommodation['frequency']
              );
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                <select name="type" required className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="visual">Visual</option>
                  <option value="auditory">Auditory</option>
                  <option value="physical">Physical</option>
                  <option value="cognitive">Cognitive</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="testing">Testing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <input type="text" name="category" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <input type="text" name="title" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea name="description" required rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Implementation</label>
              <textarea name="implementation" required rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Frequency</label>
              <select name="frequency" required className="w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="always">Always</option>
                <option value="asNeeded">As Needed</option>
                <option value="scheduled">Scheduled</option>
              </select>
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

          {templates.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Templates</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {templates.slice(0, 4).map((template) => (
                  <div key={template.id} className="cursor-pointer rounded border border-slate-200 p-3 hover:border-indigo-300">
                    <div className="mb-1 font-medium text-slate-900">{template.name}</div>
                    <div className="text-xs text-slate-600">{template.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAccommodations.map((accommodation) => (
          <div
            key={accommodation.id}
            onClick={() => setSelectedAccommodation(accommodation)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md"
          >
            <div className="mb-2 flex items-start justify-between">
              <h3 className="font-semibold text-slate-900">{accommodation.title}</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(accommodation.status)}`}>
                {accommodation.status}
              </span>
            </div>
            <p className="mb-3 line-clamp-2 text-sm text-slate-600">{accommodation.description}</p>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(accommodation.type)}`}>
                {accommodation.type}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {accommodation.frequency}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                ⭐ {accommodation.effectiveness}/5
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredAccommodations.length === 0 && !creating && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600">No accommodations found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
