'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/accessibility-api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function ProgressMonitor() {
  const [goals, setGoals] = useState<api.ProgressGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<api.ProgressGoal | null>(null);
  const [dataPoints, setDataPoints] = useState<api.ProgressDataPoint[]>([]);
  const [report, setReport] = useState<api.ProgressReport | null>(null);
  const [creating, setCreating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>('student123');
  const [filterDomain, setFilterDomain] = useState<api.ProgressGoal['domain'] | 'all'>('all');

  useEffect(() => {
    loadGoals();
  }, [selectedStudent]);

  useEffect(() => {
    if (selectedGoal) {
      loadGoalData();
    }
  }, [selectedGoal]);

  const loadGoals = async () => {
    try {
      const goalsData = await api.getProgressGoals(selectedStudent);
      setGoals(goalsData);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoalData = async () => {
    if (!selectedGoal) return;
    try {
      const [data, reportData] = await Promise.all([
        api.getProgressData(selectedGoal.id),
        api.getProgressReport(selectedGoal.id),
      ]);
      setDataPoints(data);
      setReport(reportData);
    } catch (error) {
      console.error('Failed to load goal data:', error);
    }
  };

  const handleCreateGoal = async (
    domain: api.ProgressGoal['domain'],
    subject: string,
    goal: string,
    baseline: string,
    target: string,
    targetDate: string,
    measurementMethod: string,
    frequency: api.ProgressGoal['frequency']
  ) => {
    try {
      const newGoal = await api.createProgressGoal({
        studentId: selectedStudent,
        domain,
        subject: subject || undefined,
        goal,
        baseline,
        target,
        targetDate,
        measurementMethod,
        frequency,
        status: 'notStarted',
        progress: 0,
      });
      setGoals([...goals, newGoal]);
      setCreating(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleRecordProgress = async (value: number, notes: string) => {
    if (!selectedGoal) return;
    try {
      const dataPoint = await api.recordProgress({
        goalId: selectedGoal.id,
        studentId: selectedStudent,
        date: new Date().toISOString().split('T')[0],
        value,
        notes: notes || undefined,
        recordedBy: 'teacher123',
      });
      setDataPoints([...dataPoints, dataPoint]);
      setRecording(false);
      await loadGoalData();
    } catch (error) {
      console.error('Failed to record progress:', error);
    }
  };

  const handleUpdateGoalStatus = async (status: api.ProgressGoal['status']) => {
    if (!selectedGoal) return;
    try {
      const updated = await api.updateProgressGoal(selectedGoal.id, { status });
      setGoals(goals.map((g) => (g.id === updated.id ? updated : g)));
      setSelectedGoal(updated);
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.deleteProgressGoal(id);
      setGoals(goals.filter((g) => g.id !== id));
      setSelectedGoal(null);
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const filteredGoals = goals.filter((g) => filterDomain === 'all' || g.domain === filterDomain);

  const getDomainColor = (domain: api.ProgressGoal['domain']) => {
    const colors = {
      academic: 'bg-blue-100 text-blue-700',
      behavioral: 'bg-purple-100 text-purple-700',
      social: 'bg-green-100 text-green-700',
      communication: 'bg-yellow-100 text-yellow-700',
      motor: 'bg-pink-100 text-pink-700',
      adaptive: 'bg-indigo-100 text-indigo-700',
    };
    return colors[domain];
  };

  const getStatusBadge = (status: api.ProgressGoal['status']) => {
    const badges = {
      notStarted: 'bg-slate-100 text-slate-700',
      inProgress: 'bg-blue-100 text-blue-700',
      achieved: 'bg-green-100 text-green-700',
      discontinued: 'bg-red-100 text-red-700',
    };
    return badges[status];
  };

  const getTrendIcon = (trend: api.ProgressReport['trend']) => {
    return trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '➡️';
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (selectedGoal && report) {
    const chartData = {
      labels: dataPoints.map((dp) => new Date(dp.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Progress',
          data: dataPoints.map((dp) => dp.value),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.3,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    };

    return (
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => {
            setSelectedGoal(null);
            setReport(null);
            setDataPoints([]);
          }}
          className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          ← Back to Goals
        </button>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{selectedGoal.goal}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getDomainColor(selectedGoal.domain)}`}>
                  {selectedGoal.domain}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(selectedGoal.status)}`}>
                  {selectedGoal.status}
                </span>
                {selectedGoal.subject && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {selectedGoal.subject}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRecording(true)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + Record Progress
              </button>
              <button
                onClick={() => handleDeleteGoal(selectedGoal.id)}
                className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>

          {recording && (
            <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <h3 className="mb-3 font-semibold text-slate-900">Record Progress</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleRecordProgress(
                    parseFloat(formData.get('value') as string),
                    formData.get('notes') as string
                  );
                }}
                className="space-y-3"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Value</label>
                  <input
                    type="number"
                    name="value"
                    step="0.1"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Notes (optional)</label>
                  <textarea
                    name="notes"
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecording(false)}
                    className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="text-sm text-blue-600">Baseline</div>
              <div className="text-xl font-bold text-blue-900">{selectedGoal.baseline}</div>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-sm text-green-600">Target</div>
              <div className="text-xl font-bold text-green-900">{selectedGoal.target}</div>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <div className="text-sm text-purple-600">Progress</div>
              <div className="text-xl font-bold text-purple-900">{selectedGoal.progress}%</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Progress Chart</h3>
              <span className="text-sm text-slate-600">
                {getTrendIcon(report.trend)} {report.trend}
              </span>
            </div>
            {dataPoints.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No data points recorded yet
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-slate-900">Insights</h3>
            <ul className="space-y-2">
              {report.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="text-blue-600">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 font-semibold text-slate-900">Recommendations</h3>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="text-green-600">✓</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Status</h3>
            <select
              value={selectedGoal.status}
              onChange={(e) => handleUpdateGoalStatus(e.target.value as api.ProgressGoal['status'])}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              <option value="notStarted">Not Started</option>
              <option value="inProgress">In Progress</option>
              <option value="achieved">Achieved</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Progress Monitor</h2>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
        >
          + New Goal
        </button>
      </div>

      <div className="mb-6">
        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value as any)}
          className="rounded-lg border border-slate-300 px-4 py-2"
        >
          <option value="all">All Domains</option>
          <option value="academic">Academic</option>
          <option value="behavioral">Behavioral</option>
          <option value="social">Social</option>
          <option value="communication">Communication</option>
          <option value="motor">Motor</option>
          <option value="adaptive">Adaptive</option>
        </select>
      </div>

      {creating && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Create Progress Goal</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateGoal(
                formData.get('domain') as api.ProgressGoal['domain'],
                formData.get('subject') as string,
                formData.get('goal') as string,
                formData.get('baseline') as string,
                formData.get('target') as string,
                formData.get('targetDate') as string,
                formData.get('measurementMethod') as string,
                formData.get('frequency') as api.ProgressGoal['frequency']
              );
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Domain</label>
                <select name="domain" required className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="academic">Academic</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="social">Social</option>
                  <option value="communication">Communication</option>
                  <option value="motor">Motor</option>
                  <option value="adaptive">Adaptive</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Subject (optional)</label>
                <input type="text" name="subject" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Goal</label>
              <textarea name="goal" required rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Baseline</label>
                <input type="text" name="baseline" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Target</label>
                <input type="text" name="target" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Target Date</label>
                <input type="date" name="targetDate" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Frequency</label>
                <select name="frequency" required className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Measurement Method</label>
              <input type="text" name="measurementMethod" required className="w-full rounded-lg border border-slate-300 px-3 py-2" />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGoals.map((goal) => (
          <div
            key={goal.id}
            onClick={() => setSelectedGoal(goal)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-md"
          >
            <div className="mb-2 flex items-start justify-between">
              <h3 className="font-semibold text-slate-900 line-clamp-2">{goal.goal}</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(goal.status)}`}>
                {goal.status}
              </span>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${getDomainColor(goal.domain)}`}>
                {goal.domain}
              </span>
              {goal.subject && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {goal.subject}
                </span>
              )}
            </div>
            <div className="mb-2">
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>Progress</span>
                <span>{goal.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-indigo-600" style={{ width: `${goal.progress}%` }} />
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {filteredGoals.length === 0 && !creating && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600">No progress goals found. Create one to start tracking!</p>
        </div>
      )}
    </div>
  );
}
