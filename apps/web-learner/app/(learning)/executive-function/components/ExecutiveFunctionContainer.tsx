'use client';

import { useEffect, useState } from 'react';
import { TaskManager } from './TaskManager';
import { StudyPlanner } from './StudyPlanner';
import { TimeManagement } from './TimeManagement';
import { OrganizationTools } from './OrganizationTools';
import { getTasks, getStudyPlans, getTimeBlocks, getFolders } from '../../../../lib/executive-function-api';
import type {
  Task,
  StudyPlan,
  TimeBlock,
  OrganizationFolder,
} from '../../../../lib/executive-function-api';

interface ExecutiveFunctionContainerProps {
  learnerId: string;
}

type TabType = 'tasks' | 'study' | 'time' | 'organize';

/**
 * Executive Function Container
 * 
 * Main container for executive function tools
 */
export function ExecutiveFunctionContainer({ learnerId }: ExecutiveFunctionContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [folders, setFolders] = useState<OrganizationFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [learnerId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [tasksData, plansData, blocksData, foldersData] = await Promise.all([
        getTasks(learnerId),
        getStudyPlans(learnerId),
        getTimeBlocks(learnerId),
        getFolders(learnerId),
      ]);

      setTasks(tasksData);
      setStudyPlans(plansData);
      setTimeBlocks(blocksData);
      setFolders(foldersData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load executive function tools. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">Loading tools...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`whitespace-nowrap rounded-t-lg px-6 py-3 text-sm font-medium transition ${
            activeTab === 'tasks'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ✓ Task Manager
        </button>
        <button
          onClick={() => setActiveTab('study')}
          className={`whitespace-nowrap rounded-t-lg px-6 py-3 text-sm font-medium transition ${
            activeTab === 'study'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📚 Study Planner
        </button>
        <button
          onClick={() => setActiveTab('time')}
          className={`whitespace-nowrap rounded-t-lg px-6 py-3 text-sm font-medium transition ${
            activeTab === 'time'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⏰ Time Management
        </button>
        <button
          onClick={() => setActiveTab('organize')}
          className={`whitespace-nowrap rounded-t-lg px-6 py-3 text-sm font-medium transition ${
            activeTab === 'organize'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📁 Organization
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tasks' && (
        <TaskManager learnerId={learnerId} tasks={tasks} onUpdate={loadData} />
      )}

      {activeTab === 'study' && (
        <StudyPlanner learnerId={learnerId} plans={studyPlans} onUpdate={loadData} />
      )}

      {activeTab === 'time' && (
        <TimeManagement learnerId={learnerId} blocks={timeBlocks} onUpdate={loadData} />
      )}

      {activeTab === 'organize' && (
        <OrganizationTools learnerId={learnerId} folders={folders} onUpdate={loadData} />
      )}
    </div>
  );
}
