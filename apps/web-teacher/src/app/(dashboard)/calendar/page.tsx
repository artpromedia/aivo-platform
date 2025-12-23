/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/**
 * Calendar Page
 */

'use client';

import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const events: Record<number, { title: string; type: string }[]> = {
  5: [{ title: 'Quiz 5 Due', type: 'quiz' }],
  12: [{ title: 'HW Ch6 Due', type: 'homework' }],
  15: [{ title: 'Parent Conference', type: 'meeting' }],
  18: [{ title: 'Test 2', type: 'test' }],
  20: [{ title: 'Progress Reports', type: 'report' }],
};

export default function CalendarPage() {
  const [currentMonth] = React.useState(new Date(2024, 11)); // December 2024

  // Generate calendar days
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const calendarDays: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="View your schedule and deadlines"
        actions={
          <div className="flex gap-2">
            <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              ← Previous
            </button>
            <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Today
            </button>
            <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Next →
            </button>
            <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              + Add Event
            </button>
          </div>
        }
      />

      <div className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-center text-xl font-semibold text-gray-900">December 2024</h2>

        {/* Calendar Grid */}
        <div className="mt-6">
          {/* Header */}
          <div className="grid grid-cols-7 border-b">
            {days.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`min-h-[100px] border-b border-r p-2 ${
                  day === null ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                {day !== null && (
                  <>
                    <p
                      className={`text-sm font-medium ${
                        day === new Date().getDate() ? 'text-primary-600' : 'text-gray-900'
                      }`}
                    >
                      {day}
                    </p>
                    {events[day]?.map((event, i) => (
                      <div
                        key={i}
                        className={`mt-1 truncate rounded px-1 py-0.5 text-xs ${getEventColor(event.type)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="mt-6 rounded-xl border bg-white p-6">
        <h3 className="font-semibold text-gray-900">Upcoming This Week</h3>
        <div className="mt-4 space-y-3">
          {Object.entries(events)
            .slice(0, 3)
            .map(([day, dayEvents]) =>
              dayEvents.map((event, i) => (
                <div key={`${day}-${i}`} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-3 w-3 rounded-full ${getEventDotColor(event.type)}`} />
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-500">December {day}</p>
                  </div>
                </div>
              ))
            )}
        </div>
      </div>
    </div>
  );
}

function getEventColor(type: string) {
  const colors: Record<string, string> = {
    quiz: 'bg-blue-100 text-blue-700',
    homework: 'bg-green-100 text-green-700',
    test: 'bg-red-100 text-red-700',
    meeting: 'bg-purple-100 text-purple-700',
    report: 'bg-orange-100 text-orange-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}

function getEventDotColor(type: string) {
  const colors: Record<string, string> = {
    quiz: 'bg-blue-500',
    homework: 'bg-green-500',
    test: 'bg-red-500',
    meeting: 'bg-purple-500',
    report: 'bg-orange-500',
  };
  return colors[type] || 'bg-gray-500';
}
