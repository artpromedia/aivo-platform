/// Calendar Screen
///
/// Monthly calendar view with event list for the selected day.
/// Displays class sessions, assignment deadlines, meetings, and custom events.
library;

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../models/calendar_event.dart';
import '../../providers/calendar_provider.dart';

/// Teacher calendar screen.
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  late DateTime _focusedMonth;

  @override
  void initState() {
    super.initState();
    _focusedMonth = DateTime(DateTime.now().year, DateTime.now().month);
    ref.read(calendarProvider.notifier).loadEvents();
  }

  void _previousMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1);
    });
    ref.read(calendarProvider.notifier).loadEvents(month: _focusedMonth);
  }

  void _nextMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1);
    });
    ref.read(calendarProvider.notifier).loadEvents(month: _focusedMonth);
  }

  void _goToToday() {
    final now = DateTime.now();
    setState(() {
      _focusedMonth = DateTime(now.year, now.month);
    });
    ref.read(calendarProvider.notifier).selectDate(now);
    ref.read(calendarProvider.notifier).loadEvents(month: _focusedMonth);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(calendarProvider);
    final selectedDate = state.effectiveDate;
    final dayEvents = state.selectedDayEvents;
    final eventDates = state.eventDates;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.today),
            onPressed: _goToToday,
            tooltip: 'Today',
          ),
        ],
      ),
      body: Column(
        children: [
          // Month navigation header
          _MonthHeader(
            month: _focusedMonth,
            onPrevious: _previousMonth,
            onNext: _nextMonth,
          ),
          // Calendar grid
          _CalendarGrid(
            focusedMonth: _focusedMonth,
            selectedDate: selectedDate,
            eventDates: eventDates,
            onDateSelected: (date) {
              ref.read(calendarProvider.notifier).selectDate(date);
            },
          ),
          const Divider(height: 1),
          // Selected day header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                Text(
                  DateFormat.yMMMMd().format(selectedDate),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                Text(
                  '${dayEvents.length} event${dayEvents.length == 1 ? '' : 's'}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AivoBrand.gray,
                      ),
                ),
              ],
            ),
          ),
          // Event list
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : dayEvents.isEmpty
                    ? _buildEmptyDay(context)
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: dayEvents.length,
                        itemBuilder: (context, index) {
                          return _EventCard(
                            event: dayEvents[index],
                            onTap: () => _onEventTap(dayEvents[index]),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyDay(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.event_available, size: 48, color: AivoBrand.gray[300]),
          const SizedBox(height: 12),
          Text(
            'No events this day',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AivoBrand.gray,
                ),
          ),
        ],
      ),
    );
  }

  void _onEventTap(CalendarEvent event) {
    switch (event.eventType) {
      case CalendarEventType.assignmentDue:
        if (event.assignmentId != null) {
          context.push('/assignments/${event.assignmentId}');
        }
      case CalendarEventType.classSession:
        if (event.classId != null) {
          context.push('/class/${event.classId}');
        }
      case CalendarEventType.meeting:
      case CalendarEventType.custom:
        _showEventDetails(event);
    }
  }

  void _showEventDetails(CalendarEvent event) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _eventIcon(event.eventType, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    event.title,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (event.description != null) ...[
              Text(event.description!),
              const SizedBox(height: 12),
            ],
            _DetailRow(
              icon: Icons.access_time,
              text: event.isAllDay
                  ? 'All day'
                  : '${DateFormat.jm().format(event.startTime)}'
                      '${event.endTime != null ? ' – ${DateFormat.jm().format(event.endTime!)}' : ''}',
            ),
            if (event.location != null)
              _DetailRow(icon: Icons.location_on, text: event.location!),
            if (event.className != null)
              _DetailRow(icon: Icons.class_, text: event.className!),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

// ============================================================================
// Month Header
// ============================================================================

class _MonthHeader extends StatelessWidget {
  const _MonthHeader({
    required this.month,
    required this.onPrevious,
    required this.onNext,
  });

  final DateTime month;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: onPrevious,
          ),
          Text(
            DateFormat.yMMMM().format(month),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: onNext,
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// Calendar Grid
// ============================================================================

class _CalendarGrid extends StatelessWidget {
  const _CalendarGrid({
    required this.focusedMonth,
    required this.selectedDate,
    required this.eventDates,
    required this.onDateSelected,
  });

  final DateTime focusedMonth;
  final DateTime selectedDate;
  final Set<DateTime> eventDates;
  final ValueChanged<DateTime> onDateSelected;

  @override
  Widget build(BuildContext context) {
    final firstOfMonth = DateTime(focusedMonth.year, focusedMonth.month, 1);
    final daysInMonth = DateTime(focusedMonth.year, focusedMonth.month + 1, 0).day;
    // Monday = 1, Sunday = 7. Adjust to 0-based Mon start.
    final startWeekday = (firstOfMonth.weekday - 1) % 7;
    final today = DateTime.now();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        children: [
          // Day-of-week headers
          Row(
            children: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                .map((d) => Expanded(
                      child: Center(
                        child: Text(
                          d,
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: AivoBrand.gray,
                              ),
                        ),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 4),
          // Date cells
          ...List.generate(_rowCount(startWeekday, daysInMonth), (week) {
            return Row(
              children: List.generate(7, (dow) {
                final dayIndex = week * 7 + dow - startWeekday + 1;
                if (dayIndex < 1 || dayIndex > daysInMonth) {
                  return const Expanded(child: SizedBox(height: 40));
                }

                final date = DateTime(focusedMonth.year, focusedMonth.month, dayIndex);
                final isToday = date.year == today.year &&
                    date.month == today.month &&
                    date.day == today.day;
                final isSelected = date.year == selectedDate.year &&
                    date.month == selectedDate.month &&
                    date.day == selectedDate.day;
                final hasEvents = eventDates.contains(date);

                return Expanded(
                  child: GestureDetector(
                    onTap: () => onDateSelected(date),
                    child: Container(
                      height: 40,
                      margin: const EdgeInsets.all(1),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? Theme.of(context).colorScheme.primary
                            : isToday
                                ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1)
                                : null,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '$dayIndex',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  fontWeight: isToday ? FontWeight.bold : null,
                                  color: isSelected
                                      ? Theme.of(context).colorScheme.onPrimary
                                      : null,
                                ),
                          ),
                          if (hasEvents)
                            Container(
                              width: 5,
                              height: 5,
                              margin: const EdgeInsets.only(top: 1),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isSelected
                                    ? Theme.of(context).colorScheme.onPrimary
                                    : Theme.of(context).colorScheme.primary,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            );
          }),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  int _rowCount(int startWeekday, int daysInMonth) {
    return ((startWeekday + daysInMonth + 6) / 7).floor();
  }
}

// ============================================================================
// Event Card
// ============================================================================

class _EventCard extends StatelessWidget {
  const _EventCard({
    required this.event,
    required this.onTap,
  });

  final CalendarEvent event;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: _eventIcon(event.eventType),
        title: Text(event.title),
        subtitle: Text(
          event.isAllDay
              ? 'All day'
              : DateFormat.jm().format(event.startTime) +
                  (event.endTime != null
                      ? ' – ${DateFormat.jm().format(event.endTime!)}'
                      : ''),
        ),
        trailing: event.className != null
            ? Chip(
                label: Text(
                  event.className!,
                  style: const TextStyle(fontSize: 11),
                ),
                visualDensity: VisualDensity.compact,
              )
            : null,
        onTap: onTap,
      ),
    );
  }
}

// ============================================================================
// Detail Row
// ============================================================================

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AivoBrand.gray),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

// ============================================================================
// Helpers
// ============================================================================

Widget _eventIcon(CalendarEventType type, {double size = 20}) {
  switch (type) {
    case CalendarEventType.classSession:
      return Icon(Icons.school, size: size, color: AivoBrand.primary);
    case CalendarEventType.assignmentDue:
      return Icon(Icons.assignment_late, size: size, color: Colors.orange);
    case CalendarEventType.meeting:
      return Icon(Icons.groups, size: size, color: Colors.purple);
    case CalendarEventType.custom:
      return Icon(Icons.event, size: size, color: AivoBrand.gray);
  }
}
