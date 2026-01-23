/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/**
 * Calendar Page
 */

'use client';

import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { calendarApi } from '@/lib/api';
import type { CalendarEvent, EventType } from '@/lib/types';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Fetch events for the current month
  React.useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const data = await calendarApi.getEvents({ startDate, endDate });
        setEvents(data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch events'));
      } finally {
        setLoading(false);
      }
    };
    void fetchEvents();
  }, [currentMonth]);

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

  // Group events by day
  const eventsByDay = React.useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach((event) => {
      const eventDate = new Date(event.startDate);
      if (
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear()
      ) {
        const day = eventDate.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(event);
      }
    });
    return map;
  }, [events, currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="View your schedule and deadlines"
        actions={
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              ← Previous
            </button>
            <button
              onClick={goToToday}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Next →
            </button>
            <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              + Add Event
            </button>
          </div>
        }
      />

      <div className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="text-center text-xl font-semibold text-gray-900">{monthName}</h2>

        {loading ? (
          <div className="mt-6 flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <span className="ml-3 text-gray-500">Loading events...</span>
          </div>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-red-600">{error.message}</p>
          </div>
        ) : (
          <>
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
                            day === new Date().getDate() &&
                            currentMonth.getMonth() === new Date().getMonth() &&
                            currentMonth.getFullYear() === new Date().getFullYear()
                              ? 'text-primary-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {day}
                        </p>
                        {eventsByDay[day]?.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`mt-1 truncate rounded px-1 py-0.5 text-xs ${getEventColor(event.type)}`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {(eventsByDay[day]?.length ?? 0) > 3 && (
                          <p className="mt-1 text-xs text-gray-400">
                            +{(eventsByDay[day]?.length ?? 0) - 3} more
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Upcoming */}
      <div className="mt-6 rounded-xl border bg-white p-6">
        <h3 className="font-semibold text-gray-900">Upcoming This Week</h3>
        <UpcomingEvents />
      </div>
    </div>
  );
}

function UpcomingEvents() {
  const [upcoming, setUpcoming] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const data = await calendarApi.getUpcoming({ limit: 5 });
        setUpcoming(data);
      } catch {
        // Silent fail for upcoming section
      } finally {
        setLoading(false);
      }
    };
    void fetchUpcoming();
  }, []);

  if (loading) {
    return (
      <div className="mt-4 flex items-center justify-center py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (upcoming.length === 0) {
    return <p className="mt-4 text-center text-sm text-gray-500">No upcoming events this week.</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {upcoming.map((event) => (
        <div key={event.id} className="flex items-center gap-3 rounded-lg border p-3">
          <div className={`h-3 w-3 rounded-full ${getEventDotColor(event.type)}`} />
          <div>
            <p className="font-medium text-gray-900">{event.title}</p>
            <p className="text-sm text-gray-500">
              {new Date(event.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    assignment_due: 'bg-blue-100 text-blue-700',
    class_session: 'bg-green-100 text-green-700',
    meeting: 'bg-purple-100 text-purple-700',
    iep_meeting: 'bg-orange-100 text-orange-700',
    parent_conference: 'bg-pink-100 text-pink-700',
    professional_development: 'bg-teal-100 text-teal-700',
    holiday: 'bg-red-100 text-red-700',
    deadline: 'bg-yellow-100 text-yellow-700',
    quiz: 'bg-blue-100 text-blue-700',
    homework: 'bg-green-100 text-green-700',
    test: 'bg-red-100 text-red-700',
    report: 'bg-orange-100 text-orange-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}

function getEventDotColor(type: string): string {
  const colors: Record<string, string> = {
    assignment_due: 'bg-blue-500',
    class_session: 'bg-green-500',
    meeting: 'bg-purple-500',
    iep_meeting: 'bg-orange-500',
    parent_conference: 'bg-pink-500',
    professional_development: 'bg-teal-500',
    holiday: 'bg-red-500',
    deadline: 'bg-yellow-500',
    quiz: 'bg-blue-500',
    homework: 'bg-green-500',
    test: 'bg-red-500',
    report: 'bg-orange-500',
  };
  return colors[type] || 'bg-gray-500';
}
