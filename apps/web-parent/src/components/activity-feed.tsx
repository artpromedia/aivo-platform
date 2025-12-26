'use client';

import { formatDistanceToNow } from 'date-fns';
import { BookOpen, FileText, CheckCircle, Award } from 'lucide-react';

interface Activity {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'achievement';
  title: string;
  subject: string;
  score?: number;
  completedAt: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'lesson':
        return <BookOpen className="w-4 h-4" />;
      case 'quiz':
        return <FileText className="w-4 h-4" />;
      case 'assignment':
        return <CheckCircle className="w-4 h-4" />;
      case 'achievement':
        return <Award className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'lesson':
        return 'bg-blue-100 text-blue-600';
      case 'quiz':
        return 'bg-purple-100 text-purple-600';
      case 'assignment':
        return 'bg-green-100 text-green-600';
      case 'achievement':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (activities.length === 0) {
    return <p className="text-gray-500 text-sm">No recent activity</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(
              activity.type
            )}`}
          >
            {getIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{activity.title}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{activity.subject}</span>
              {activity.score !== undefined && (
                <>
                  <span>•</span>
                  <span
                    className={
                      activity.score >= 80
                        ? 'text-green-600'
                        : activity.score >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }
                  >
                    {activity.score}%
                  </span>
                </>
              )}
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(activity.completedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
