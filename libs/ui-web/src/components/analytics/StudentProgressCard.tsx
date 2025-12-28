// Student Progress Card Component
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface StudentProgressData {
  studentId: string;
  studentName: string;
  overallMastery: number;
  lessonsCompleted: number;
  accuracy: number;
  timeSpentMinutes: number;
  streak: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  trend: Array<{ date: string; mastery: number }>;
}

interface StudentProgressCardProps {
  data: StudentProgressData;
  onViewDetails?: (studentId: string) => void;
}

export const StudentProgressCard: React.FC<StudentProgressCardProps> = ({ data, onViewDetails }) => {
  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{data.studentName}</h3>
          <p className="text-sm text-gray-500">Streak: {data.streak} days</p>
        </div>
        {data.riskLevel && data.riskLevel !== 'low' && (
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getRiskColor(data.riskLevel)}`}>
            {data.riskLevel.toUpperCase()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">{Math.round(data.overallMastery * 100)}%</div>
          <div className="text-xs text-gray-500">Mastery</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">{data.lessonsCompleted}</div>
          <div className="text-xs text-gray-500">Lessons</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-600">{Math.round(data.accuracy * 100)}%</div>
          <div className="text-xs text-gray-500">Accuracy</div>
        </div>
      </div>

      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.trend}>
            <Line type="monotone" dataKey="mastery" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 1]} hide />
            <Tooltip formatter={(v: number) => `${Math.round(v * 100)}%`} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {onViewDetails && (
        <button
          onClick={() => onViewDetails(data.studentId)}
          className="mt-3 w-full text-sm text-blue-600 hover:text-blue-800"
        >
          View Details →
        </button>
      )}
    </div>
  );
};

export default StudentProgressCard;
