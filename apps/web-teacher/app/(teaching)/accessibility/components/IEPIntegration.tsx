'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/accessibility-api';

export function IEPIntegration() {
  const [documents, setDocuments] = useState<api.IEPDocument[]>([]);
  const [goals, setGoals] = useState<api.IEPGoal[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<api.IEPDocument | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<api.IEPGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>('student123');
  const [creatingGoal, setCreatingGoal] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedStudent]);

  const loadData = async () => {
    try {
      const [docsData, goalsData] = await Promise.all([
        api.getIEPDocuments(selectedStudent),
        api.getIEPGoals(selectedStudent),
      ]);
      setDocuments(docsData);
      setGoals(goalsData);
    } catch (error) {
      console.error('Failed to load IEP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (
    iepId: string,
    domain: string,
    annualGoal: string,
    objectives: string[],
    accommodations: string[],
    services: string[],
    progressReporting: api.IEPGoal['progressReporting'],
    startDate: string,
    endDate: string
  ) => {
    try {
      const newGoal = await api.createIEPGoal({
        studentId: selectedStudent,
        iepId,
        domain,
        annualGoal,
        shortTermObjectives: objectives.map((obj, index) => ({
          id: `obj-${index}`,
          objective: obj,
          criteria: 'To be defined',
          method: 'To be defined',
          schedule: 'To be defined',
          status: 'notStarted',
          progress: 0,
        })),
        accommodations,
        services,
        progressReporting,
        status: 'active',
        startDate,
        endDate,
      });
      setGoals([...goals, newGoal]);
      setCreatingGoal(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleUpdateObjective = async (
    goalId: string,
    objectiveId: string,
    progress: number,
    status: api.IEPObjective['status']
  ) => {
    try {
      const updated = await api.updateObjectiveProgress(goalId, objectiveId, progress, status);
      setGoals(goals.map((g) => (g.id === updated.id ? updated : g)));
      if (selectedGoal?.id === goalId) {
        setSelectedGoal(updated);
      }
    } catch (error) {
      console.error('Failed to update objective:', error);
    }
  };

  const getStatusColor = (status: api.IEPDocument['status'] | api.IEPGoal['status']) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-700',
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      amended: 'bg-blue-100 text-blue-700',
      achieved: 'bg-green-100 text-green-700',
      modified: 'bg-yellow-100 text-yellow-700',
      discontinued: 'bg-red-100 text-red-700',
    };
    return colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-700';
  };

  const getObjectiveStatusColor = (status: api.IEPObjective['status']) => {
    const colors = {
      notStarted: 'bg-slate-100 text-slate-700',
      inProgress: 'bg-blue-100 text-blue-700',
      achieved: 'bg-green-100 text-green-700',
    };
    return colors[status];
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (selectedGoal) {
    return (
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => setSelectedGoal(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to IEP Goals
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{selectedGoal.annualGoal}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {selectedGoal.domain}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(selectedGoal.status)}`}>
                  {selectedGoal.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-slate-900">Short-Term Objectives</h3>
            <div className="space-y-4">
              {selectedGoal.shortTermObjectives.map((objective) => (
                <div key={objective.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <p className="flex-1 font-medium text-slate-900">{objective.objective}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getObjectiveStatusColor(objective.status)}`}>
                      {objective.status}
                    </span>
                  </div>

                  <div className="mb-3 grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <span className="font-medium text-slate-700">Criteria:</span>
                      <p className="text-slate-600">{objective.criteria}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Method:</span>
                      <p className="text-slate-600">{objective.method}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Schedule:</span>
                      <p className="text-slate-600">{objective.schedule}</p>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="mb-1 flex justify-between text-xs text-slate-600">
                      <span>Progress</span>
                      <span>{objective.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full bg-indigo-600" style={{ width: `${objective.progress}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={objective.progress}
                      onChange={(e) => {
                        const newProgress = parseInt(e.target.value);
                        const newStatus: api.IEPObjective['status'] =
                          newProgress === 100 ? 'achieved' : newProgress > 0 ? 'inProgress' : 'notStarted';
                        handleUpdateObjective(selectedGoal.id, objective.id, newProgress, newStatus);
                      }}
                      className="flex-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-slate-900">Accommodations</h3>
            <ul className="space-y-2">
              {selectedGoal.accommodations.map((acc, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="text-green-600">✓</span>
                  {acc}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-slate-900">Services</h3>
            <ul className="space-y-2">
              {selectedGoal.services.map((service, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="text-blue-600">•</span>
                  {service}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div>
              <span className="font-medium text-slate-700">Progress Reporting:</span>
              <p className="text-slate-900">{selectedGoal.progressReporting}</p>
            </div>
            <div>
              <span className="font-medium text-slate-700">Start Date:</span>
              <p className="text-slate-900">{new Date(selectedGoal.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-slate-700">End Date:</span>
              <p className="text-slate-900">{new Date(selectedGoal.endDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedDocument) {
    const activeGoals = goals.filter((g) => selectedDocument.goals.includes(g.id));

    return (
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => setSelectedDocument(null)}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to IEP Documents
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">IEP Document</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(selectedDocument.status)}`}>
                  {selectedDocument.status}
                </span>
                <span className="text-sm text-slate-600">
                  Meeting: {new Date(selectedDocument.meetingDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="text-sm text-blue-600">Effective Date</div>
              <div className="font-medium text-blue-900">{new Date(selectedDocument.effectiveDate).toLocaleDateString()}</div>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-sm text-green-600">Expiration Date</div>
              <div className="font-medium text-green-900">{new Date(selectedDocument.expirationDate).toLocaleDateString()}</div>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <div className="text-sm text-purple-600">Goals</div>
              <div className="font-medium text-purple-900">{activeGoals.length} goals</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-slate-900">IEP Goals</h3>
            <div className="space-y-3">
              {activeGoals.map((goal) => (
                <div
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-4 hover:border-indigo-300"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <h4 className="flex-1 font-medium text-slate-900">{goal.annualGoal}</h4>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(goal.status)}`}>
                      {goal.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{goal.domain}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                      {goal.shortTermObjectives.length} objectives
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-slate-900">Services</h3>
            <div className="space-y-2">
              {selectedDocument.services.map((service, i) => (
                <div key={i} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="font-medium text-slate-900">{service.type}</div>
                  <div className="text-slate-600">
                    {service.frequency} • {service.duration} min • {service.location} • {service.provider}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-slate-900">IEP Team</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {selectedDocument.team.map((member, i) => (
                <div key={i} className="rounded border border-slate-200 bg-slate-50 p-3">
                  <div className="font-medium text-slate-900">{member.name}</div>
                  <div className="text-sm text-slate-600">{member.role}</div>
                  <div className="text-xs text-slate-500">{member.email}</div>
                </div>
              ))}
            </div>
          </div>

          {selectedDocument.documents.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-slate-900">Attachments</h3>
              <div className="space-y-2">
                {selectedDocument.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3 hover:border-indigo-300"
                  >
                    <span className="text-2xl">📄</span>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{doc.name}</div>
                      <div className="text-xs text-slate-500">
                        {doc.type} • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">IEP Integration</h2>
        <button
          onClick={() => setCreatingGoal(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          + New IEP Goal
        </button>
      </div>

      {creatingGoal && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Create IEP Goal</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const objectives = (formData.get('objectives') as string).split('\n').filter((o) => o.trim());
              const accommodations = (formData.get('accommodations') as string).split('\n').filter((a) => a.trim());
              const services = (formData.get('services') as string).split('\n').filter((s) => s.trim());
              handleCreateGoal(
                formData.get('iepId') as string,
                formData.get('domain') as string,
                formData.get('annualGoal') as string,
                objectives,
                accommodations,
                services,
                formData.get('progressReporting') as api.IEPGoal['progressReporting'],
                formData.get('startDate') as string,
                formData.get('endDate') as string
              );
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">IEP Document</label>
                <select name="iepId" required className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      IEP - {new Date(doc.meetingDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Domain</label>
                <input type="text" name="domain" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Annual Goal</label>
              <textarea name="annualGoal" required rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Short-Term Objectives (one per line)</label>
              <textarea name="objectives" required rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Accommodations (one per line)</label>
              <textarea name="accommodations" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Services (one per line)</label>
              <textarea name="services" rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Progress Reporting</label>
                <select name="progressReporting" required className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="quarterly">Quarterly</option>
                  <option value="trimester">Trimester</option>
                  <option value="semester">Semester</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
                <input type="date" name="startDate" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
                <input type="date" name="endDate" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700">
                Create
              </button>
              <button type="button" onClick={() => setCreatingGoal(false)} className="rounded-lg bg-slate-200 px-6 py-2 font-medium text-slate-700 hover:bg-slate-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-8">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">IEP Documents</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDocument(doc)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-semibold text-slate-900">IEP Document</h4>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(doc.status)}`}>
                  {doc.status}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div>Meeting: {new Date(doc.meetingDate).toLocaleDateString()}</div>
                <div>Effective: {new Date(doc.effectiveDate).toLocaleDateString()}</div>
                <div>Expires: {new Date(doc.expirationDate).toLocaleDateString()}</div>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{doc.goals.length} goals</span>
                <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">{doc.services.length} services</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">All IEP Goals</h3>
        <div className="space-y-3">
          {goals.map((goal) => (
            <div
              key={goal.id}
              onClick={() => setSelectedGoal(goal)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300"
            >
              <div className="mb-2 flex items-start justify-between">
                <h4 className="flex-1 font-semibold text-slate-900">{goal.annualGoal}</h4>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(goal.status)}`}>
                  {goal.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">{goal.domain}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                  {goal.shortTermObjectives.length} objectives
                </span>
                <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">
                  {goal.progressReporting}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {goals.length === 0 && documents.length === 0 && !creatingGoal && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600">No IEP documents or goals found.</p>
        </div>
      )}
    </div>
  );
}
