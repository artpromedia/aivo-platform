'use client';

interface BreakActivitiesProps {
  onSelect: (activityType: string) => void;
  onSkip: () => void;
}

interface Activity {
  id: string;
  name: string;
  icon: string;
  description: string;
  duration: string;
  benefits: string[];
}

const BREAK_ACTIVITIES: Activity[] = [
  {
    id: 'breathing',
    name: 'Breathing Exercise',
    icon: '🫁',
    description: 'Calm your mind with guided breathing',
    duration: '3-5 minutes',
    benefits: ['Reduces stress', 'Improves focus', 'Calms anxiety'],
  },
  {
    id: 'stretching',
    name: 'Stretching',
    icon: '🧘',
    description: 'Release tension with gentle stretches',
    duration: '5 minutes',
    benefits: ['Relieves muscle tension', 'Improves circulation', 'Boosts energy'],
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    icon: '🧠',
    description: 'Practice mindful awareness',
    duration: '5 minutes',
    benefits: ['Increases awareness', 'Reduces mind wandering', 'Improves mood'],
  },
  {
    id: 'movement',
    name: 'Movement Break',
    icon: '🏃',
    description: 'Get your body moving',
    duration: '5-10 minutes',
    benefits: ['Increases energy', 'Improves blood flow', 'Boosts mood'],
  },
  {
    id: 'free',
    name: 'Free Break',
    icon: '☕',
    description: 'Take a break however you like',
    duration: 'Flexible',
    benefits: ['Personal choice', 'Flexibility', 'Autonomy'],
  },
];

/**
 * Break Activities Modal
 * 
 * Displays activity options when a focus session completes
 */
export function BreakActivities({ onSelect, onSkip }: BreakActivitiesProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 text-white">
          <h2 className="text-2xl font-bold">Great Job! Time for a Break 🎉</h2>
          <p className="mt-2 text-green-100">
            Choose an activity to recharge before your next focus session
          </p>
        </div>

        {/* Activities Grid */}
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          {BREAK_ACTIVITIES.map((activity) => (
            <button
              key={activity.id}
              onClick={() => onSelect(activity.id)}
              className="group rounded-xl border-2 border-slate-200 bg-white p-6 text-left transition hover:border-green-500 hover:shadow-lg"
            >
              <div className="text-4xl">{activity.icon}</div>
              <h3 className="mt-3 font-bold text-slate-900 group-hover:text-green-600">
                {activity.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{activity.description}</p>
              <div className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                {activity.duration}
              </div>
              <ul className="mt-3 space-y-1">
                {activity.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="text-green-500">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6">
          <button
            onClick={onSkip}
            className="w-full rounded-lg border-2 border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Skip Break (Not Recommended)
          </button>
        </div>
      </div>
    </div>
  );
}
