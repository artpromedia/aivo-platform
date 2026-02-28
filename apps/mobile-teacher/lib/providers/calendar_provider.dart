/// Calendar Provider
///
/// State management for the teacher's calendar with events from
/// class sessions, assignment deadlines, meetings, and custom events.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import '../models/calendar_event.dart';
import 'core_providers.dart';

// ============================================================================
// State Classes
// ============================================================================

/// Calendar state.
class CalendarState {
  const CalendarState({
    this.events = const [],
    this.isLoading = false,
    this.error,
    this.selectedDate,
    this.lastUpdated,
  });

  final List<CalendarEvent> events;
  final bool isLoading;
  final String? error;
  final DateTime? selectedDate;
  final DateTime? lastUpdated;

  /// The selected date or today.
  DateTime get effectiveDate => selectedDate ?? DateTime.now();

  /// All events on the selected date.
  List<CalendarEvent> get selectedDayEvents {
    final d = effectiveDate;
    return events.where((e) {
      return e.startTime.year == d.year &&
          e.startTime.month == d.month &&
          e.startTime.day == d.day;
    }).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
  }

  /// Dates that have events (for dot indicators on the calendar grid).
  Set<DateTime> get eventDates {
    return events
        .map((e) => DateTime(e.startTime.year, e.startTime.month, e.startTime.day))
        .toSet();
  }

  /// Events happening today.
  List<CalendarEvent> get todaysEvents {
    final now = DateTime.now();
    return events.where((e) {
      return e.startTime.year == now.year &&
          e.startTime.month == now.month &&
          e.startTime.day == now.day;
    }).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
  }

  /// Upcoming events (next 7 days, sorted).
  List<CalendarEvent> get upcomingEvents {
    final now = DateTime.now();
    final weekLater = now.add(const Duration(days: 7));
    return events
        .where((e) => e.startTime.isAfter(now) && e.startTime.isBefore(weekLater))
        .toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
  }

  CalendarState copyWith({
    List<CalendarEvent>? events,
    bool? isLoading,
    String? error,
    DateTime? selectedDate,
    DateTime? lastUpdated,
  }) {
    return CalendarState(
      events: events ?? this.events,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      selectedDate: selectedDate ?? this.selectedDate,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

// ============================================================================
// State Notifier
// ============================================================================

/// Calendar notifier.
class CalendarNotifier extends StateNotifier<CalendarState> {
  CalendarNotifier(this._api) : super(const CalendarState());

  final AivoApiClient _api;

  /// Load events for a given month.
  Future<void> loadEvents({DateTime? month}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final target = month ?? DateTime.now();
      // Fetch the whole month with some buffer
      final start = DateTime(target.year, target.month - 1, 1);
      final end = DateTime(target.year, target.month + 2, 0);

      final response = await _api.get(
        '/teacher-planning/calendar/events',
        queryParameters: {
          'startDate': start.toIso8601String(),
          'endDate': end.toIso8601String(),
        },
      );

      final List<dynamic> data = response.data['events'] ?? [];
      final events = data
          .map((json) => CalendarEvent.fromJson(json as Map<String, dynamic>))
          .toList();

      state = state.copyWith(
        events: events,
        isLoading: false,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Select a day on the calendar.
  void selectDate(DateTime date) {
    state = state.copyWith(selectedDate: date);
  }

  /// Create a new event.
  Future<void> createEvent(CalendarEvent event) async {
    try {
      final response = await _api.post(
        '/teacher-planning/calendar/events',
        data: event.toJson(),
      );

      final created = CalendarEvent.fromJson(
        response.data as Map<String, dynamic>,
      );

      state = state.copyWith(
        events: [...state.events, created],
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Delete an event.
  Future<void> deleteEvent(String eventId) async {
    try {
      await _api.delete('/teacher-planning/calendar/events/$eventId');
      state = state.copyWith(
        events: state.events.where((e) => e.id != eventId).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Refresh events.
  Future<void> refresh() async {
    await loadEvents(month: state.effectiveDate);
  }
}

// ============================================================================
// Providers
// ============================================================================

/// Calendar state provider.
final calendarProvider =
    StateNotifierProvider<CalendarNotifier, CalendarState>((ref) {
  final api = ref.watch(apiClientProvider);
  return CalendarNotifier(api);
});

/// Events for a specific date provider.
final eventsForDateProvider =
    Provider.family<List<CalendarEvent>, DateTime>((ref, date) {
  final state = ref.watch(calendarProvider);
  return state.events.where((e) {
    return e.startTime.year == date.year &&
        e.startTime.month == date.month &&
        e.startTime.day == date.day;
  }).toList()
    ..sort((a, b) => a.startTime.compareTo(b.startTime));
});

/// Today's event count provider.
final todayEventCountProvider = Provider<int>((ref) {
  final state = ref.watch(calendarProvider);
  return state.todaysEvents.length;
});
