# Intervention Recommendations System - Quick Start Guide

A practical guide for developers implementing AI-powered intervention features in mobile-teacher.

## Quick Reference

### Import Statements

```dart
// Models
import 'package:mobile_teacher/models/intervention.dart';

// Repository
import 'package:mobile_teacher/repositories/intervention_repository.dart';

// Providers
import 'package:mobile_teacher/providers/intervention_provider.dart';

// For integration with risk system
import 'package:mobile_teacher/providers/risk_provider.dart';
```

## Common Use Cases

### 1. Display AI Recommendations

```dart
class RecommendationsWidget extends ConsumerWidget {
  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch high-priority AI suggestions
    final suggestions = ref.watch(highPriorityRecommendationsProvider);

    return ListView.builder(
      itemCount: suggestions.length,
      itemBuilder: (context, index) {
        final suggestion = suggestions[index];
        return InterventionSuggestionCard(
          title: suggestion.template.title,
          relevance: suggestion.relevanceScore,
          reasoning: suggestion.reasoning,
          expectedImpact: suggestion.expectedImpact,
          onAccept: () => _acceptSuggestion(ref, suggestion),
        );
      },
    );
  }

  Future<void> _acceptSuggestion(
    WidgetRef ref,
    InterventionSuggestion suggestion,
  ) async {
    final intervention = suggestion.template.toIntervention(
      studentId: studentId,
      teacherId: ref.read(currentTeacherProvider).id,
      priority: InterventionPriority.high,
    );

    await ref.read(activeInterventionsProvider.notifier)
        .createIntervention(intervention);
  }
}
```

### 2. Load Recommendations from Risk Profile

```dart
class StudentRiskDashboard extends ConsumerStatefulWidget {
  final String studentId;

  @override
  ConsumerState<StudentRiskDashboard> createState() =>
      _StudentRiskDashboardState();
}

class _StudentRiskDashboardState
    extends ConsumerState<StudentRiskDashboard> {

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // Load risk profile
    final profile = await ref.read(
      studentRiskProfileProvider(widget.studentId).future
    );

    // Extract top risk factors
    final riskFactors = profile.currentRisk.topRiskFactors
        .map((f) => f.feature)
        .toList();

    // Load AI recommendations based on risk
    ref.read(recommendedInterventionsProvider.notifier)
        .loadRecommendations(
          widget.studentId,
          riskFactors: riskFactors,
        );

    // Load active interventions
    ref.read(activeInterventionsProvider.notifier)
        .loadActiveInterventions(widget.studentId);
  }

  @override
  Widget build(BuildContext context) {
    final recommendedState = ref.watch(recommendedInterventionsProvider);
    final activeState = ref.watch(activeInterventionsProvider);

    return Column(
      children: [
        // Risk Summary
        RiskScoreCard(studentId: widget.studentId),

        // AI Recommendations
        if (recommendedState.suggestions.isNotEmpty)
          AIRecommendationsSection(
            suggestions: recommendedState.suggestions,
          ),

        // Active Interventions
        if (activeState.activeCount > 0)
          ActiveInterventionsSection(
            interventions: activeState.interventions,
          ),

        // Urgent/Overdue Alerts
        if (activeState.urgent.isNotEmpty ||
            activeState.overdue.isNotEmpty)
          AlertsSection(
            urgent: activeState.urgent,
            overdue: activeState.overdue,
          ),
      ],
    );
  }
}
```

### 3. Create Intervention

```dart
class CreateInterventionForm extends ConsumerStatefulWidget {
  final String studentId;
  final InterventionSuggestion? suggestion; // Optional AI suggestion

  @override
  ConsumerState<CreateInterventionForm> createState() =>
      _CreateInterventionFormState();
}

class _CreateInterventionFormState
    extends ConsumerState<CreateInterventionForm> {

  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;

  InterventionCategory _category = InterventionCategory.academic;
  InterventionPriority _priority = InterventionPriority.medium;
  InterventionType _type = InterventionType.oneOnOne;
  List<String> _targetRiskFactors = [];
  int _estimatedDays = 7;

  @override
  void initState() {
    super.initState();

    // Pre-fill from AI suggestion if provided
    if (widget.suggestion != null) {
      final template = widget.suggestion!.template;
      _titleController = TextEditingController(text: template.title);
      _descriptionController = TextEditingController(
        text: template.description,
      );
      _category = template.category;
      _type = template.type;
      _targetRiskFactors = List.from(template.applicableRiskFactors);
      _estimatedDays = template.estimatedDurationDays;
    } else {
      _titleController = TextEditingController();
      _descriptionController = TextEditingController();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: EdgeInsets.all(16),
        children: [
          // Title
          TextFormField(
            controller: _titleController,
            decoration: InputDecoration(labelText: 'Title'),
            validator: (value) =>
                value?.isEmpty ?? true ? 'Required' : null,
          ),

          SizedBox(height: 16),

          // Description
          TextFormField(
            controller: _descriptionController,
            decoration: InputDecoration(labelText: 'Description'),
            maxLines: 3,
            validator: (value) =>
                value?.isEmpty ?? true ? 'Required' : null,
          ),

          SizedBox(height: 16),

          // Category dropdown
          DropdownButtonFormField<InterventionCategory>(
            value: _category,
            decoration: InputDecoration(labelText: 'Category'),
            items: InterventionCategory.values.map((cat) {
              return DropdownMenuItem(
                value: cat,
                child: Text(cat.displayName),
              );
            }).toList(),
            onChanged: (value) => setState(() => _category = value!),
          ),

          // ... other form fields ...

          SizedBox(height: 24),

          // Submit button
          ElevatedButton(
            onPressed: _saveIntervention,
            child: Text('Create Intervention'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveIntervention() async {
    if (!_formKey.currentState!.validate()) return;

    final teacherId = ref.read(currentTeacherProvider).id;

    final intervention = Intervention(
      id: '', // Temporary ID for offline
      studentId: widget.studentId,
      title: _titleController.text,
      description: _descriptionController.text,
      category: _category,
      type: _type,
      priority: _priority,
      status: InterventionStatus.planned,
      targetRiskFactors: _targetRiskFactors,
      createdAt: DateTime.now(),
      createdBy: teacherId,
      estimatedDurationDays: _estimatedDays,
      relatedRecommendationId: widget.suggestion?.template.id,
    );

    try {
      await ref.read(activeInterventionsProvider.notifier)
          .createIntervention(intervention);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Intervention created')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
}
```

### 4. Update Intervention Status

```dart
class InterventionCard extends ConsumerWidget {
  final Intervention intervention;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListTile(
        title: Text(intervention.title),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(intervention.description),
            SizedBox(height: 4),
            Row(
              children: [
                Chip(
                  label: Text(intervention.status.displayName),
                  backgroundColor: _getStatusColor(intervention.status),
                ),
                SizedBox(width: 8),
                if (intervention.isOverdue)
                  Chip(
                    label: Text('Overdue'),
                    backgroundColor: Colors.red,
                  ),
              ],
            ),
          ],
        ),
        trailing: PopupMenuButton<InterventionStatus>(
          icon: Icon(Icons.more_vert),
          itemBuilder: (context) => [
            if (intervention.status == InterventionStatus.planned)
              PopupMenuItem(
                value: InterventionStatus.inProgress,
                child: Text('Start'),
              ),
            if (intervention.status == InterventionStatus.inProgress)
              ...[
                PopupMenuItem(
                  value: InterventionStatus.completed,
                  child: Text('Complete'),
                ),
                PopupMenuItem(
                  value: InterventionStatus.onHold,
                  child: Text('Put on Hold'),
                ),
              ],
            if (intervention.status != InterventionStatus.dismissed)
              PopupMenuItem(
                value: InterventionStatus.dismissed,
                child: Text('Dismiss'),
              ),
          ],
          onSelected: (newStatus) =>
              _updateStatus(ref, intervention.id, newStatus),
        ),
      ),
    );
  }

  Future<void> _updateStatus(
    WidgetRef ref,
    String interventionId,
    InterventionStatus newStatus,
  ) async {
    // Show notes dialog if completing or dismissing
    String? notes;
    if (newStatus == InterventionStatus.completed ||
        newStatus == InterventionStatus.dismissed) {
      notes = await _showNotesDialog();
      if (notes == null) return; // User cancelled
    }

    await ref.read(activeInterventionsProvider.notifier)
        .updateStatus(interventionId, newStatus, notes: notes);

    // If completed, prompt for outcome
    if (newStatus == InterventionStatus.completed) {
      _showOutcomeDialog(ref, intervention);
    }
  }

  Color _getStatusColor(InterventionStatus status) {
    switch (status) {
      case InterventionStatus.planned:
        return Colors.blue.shade100;
      case InterventionStatus.inProgress:
        return Colors.green.shade100;
      case InterventionStatus.completed:
        return Colors.grey.shade300;
      case InterventionStatus.dismissed:
        return Colors.red.shade100;
      case InterventionStatus.onHold:
        return Colors.orange.shade100;
      default:
        return Colors.grey.shade100;
    }
  }
}
```

### 5. Log Intervention Outcome

```dart
class OutcomeDialog extends ConsumerStatefulWidget {
  final Intervention intervention;

  @override
  ConsumerState<OutcomeDialog> createState() => _OutcomeDialogState();
}

class _OutcomeDialogState extends ConsumerState<OutcomeDialog> {
  final _formKey = GlobalKey<FormState>();

  InterventionEffectiveness _effectiveness =
      InterventionEffectiveness.unknown;
  double _impactOnRisk = 0.0;
  String _observations = '';
  String? _studentFeedback;
  bool _recommendContinuation = false;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Log Outcome'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Effectiveness rating
              DropdownButtonFormField<InterventionEffectiveness>(
                value: _effectiveness,
                decoration: InputDecoration(
                  labelText: 'Effectiveness',
                ),
                items: InterventionEffectiveness.values.map((eff) {
                  return DropdownMenuItem(
                    value: eff,
                    child: Text(eff.displayName),
                  );
                }).toList(),
                onChanged: (value) =>
                    setState(() => _effectiveness = value!),
              ),

              SizedBox(height: 16),

              // Impact on risk slider
              Text('Impact on Risk: ${(_impactOnRisk * 100).toInt()}%'),
              Slider(
                value: _impactOnRisk,
                min: -1.0,
                max: 1.0,
                divisions: 20,
                label: '${(_impactOnRisk * 100).toInt()}%',
                onChanged: (value) =>
                    setState(() => _impactOnRisk = value),
              ),

              SizedBox(height: 16),

              // Observations
              TextFormField(
                decoration: InputDecoration(
                  labelText: 'Observations',
                  hintText: 'What happened? What worked/didn\'t work?',
                ),
                maxLines: 3,
                onChanged: (value) => _observations = value,
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Required' : null,
              ),

              SizedBox(height: 16),

              // Student feedback (optional)
              TextFormField(
                decoration: InputDecoration(
                  labelText: 'Student Feedback (Optional)',
                ),
                maxLines: 2,
                onChanged: (value) => _studentFeedback = value,
              ),

              SizedBox(height: 16),

              // Recommend continuation
              CheckboxListTile(
                title: Text('Recommend Continuation'),
                value: _recommendContinuation,
                onChanged: (value) =>
                    setState(() => _recommendContinuation = value ?? false),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submitOutcome,
          child: Text('Submit'),
        ),
      ],
    );
  }

  Future<void> _submitOutcome() async {
    if (!_formKey.currentState!.validate()) return;

    final teacherId = ref.read(currentTeacherProvider).id;

    final outcome = InterventionOutcome(
      id: '',
      interventionId: widget.intervention.id,
      studentId: widget.intervention.studentId,
      recordedAt: DateTime.now(),
      recordedBy: teacherId,
      effectiveness: _effectiveness,
      impactOnRisk: _impactOnRisk,
      observations: _observations,
      studentFeedback: _studentFeedback,
      recommendContinuation: _recommendContinuation,
    );

    try {
      await ref.read(interventionHistoryProvider.notifier)
          .logOutcome(outcome);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Outcome logged successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error logging outcome: $e')),
        );
      }
    }
  }
}
```

### 6. Filter Interventions

```dart
class InterventionFilters extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(interventionFilterProvider);

    return ExpansionTile(
      title: Text('Filters'),
      children: [
        // Category filter
        Wrap(
          spacing: 8,
          children: InterventionCategory.values.map((cat) {
            final isSelected = filter.category == cat;
            return FilterChip(
              label: Text(cat.displayName),
              selected: isSelected,
              onSelected: (selected) {
                ref.read(interventionFilterProvider.notifier)
                    .setCategory(selected ? cat : null);
              },
            );
          }).toList(),
        ),

        SizedBox(height: 8),

        // Status filter
        Wrap(
          spacing: 8,
          children: InterventionStatus.values.map((status) {
            final isSelected = filter.status == status;
            return FilterChip(
              label: Text(status.displayName),
              selected: isSelected,
              onSelected: (selected) {
                ref.read(interventionFilterProvider.notifier)
                    .setStatus(selected ? status : null);
              },
            );
          }).toList(),
        ),

        SizedBox(height: 8),

        // Priority filter
        Wrap(
          spacing: 8,
          children: InterventionPriority.values.map((priority) {
            final isSelected = filter.priority == priority;
            return FilterChip(
              label: Text(priority.displayName),
              selected: isSelected,
              onSelected: (selected) {
                ref.read(interventionFilterProvider.notifier)
                    .setPriority(selected ? priority : null);
              },
            );
          }).toList(),
        ),
      ],
    );
  }
}

// Use filtered interventions
class FilteredInterventionsList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filteredInterventions = ref.watch(filteredInterventionsProvider);

    return ListView.builder(
      itemCount: filteredInterventions.length,
      itemBuilder: (context, index) {
        return InterventionCard(
          intervention: filteredInterventions[index],
        );
      },
    );
  }
}
```

## Provider Cheat Sheet

### Stateful Providers (Notifiers)

- `recommendedInterventionsProvider` - AI suggestions state
- `activeInterventionsProvider` - Active interventions state
- `interventionHistoryProvider` - Historical data state
- `interventionFilterProvider` - Filter options state

### Family Providers (With Parameters)

- `interventionProvider(interventionId)` - Single intervention
- `interventionTemplatesProvider(category)` - Templates by category
- `aiRecommendationsProvider((studentId, riskFactors))` - AI suggestions

### Computed Providers (Read-only)

- `highPriorityRecommendationsProvider` - Top 5 suggestions (≥70%)
- `urgentInterventionsCountProvider` - Count of urgent
- `overdueInterventionsProvider` - List of overdue
- `hasActiveInterventionsProvider` - Boolean check
- `interventionEffectivenessProvider` - Average effectiveness
- `totalRiskReductionProvider` - Cumulative risk reduction
- `filteredInterventionsProvider` - Filtered list

## Error Handling

```dart
// Handle loading/error states
final recommendedState = ref.watch(recommendedInterventionsProvider);

if (recommendedState.isLoading) {
  return CircularProgressIndicator();
}

if (recommendedState.error != null) {
  return ErrorWidget(
    message: recommendedState.error!,
    onRetry: () {
      ref.read(recommendedInterventionsProvider.notifier)
          .loadRecommendations(studentId);
    },
  );
}

// Handle network errors gracefully
try {
  await ref.read(activeInterventionsProvider.notifier)
      .createIntervention(intervention);
} on NetworkException catch (e) {
  // Offline - intervention queued for sync
  showSnackBar('Saved offline. Will sync when online.');
} on ServerException catch (e) {
  // Server error
  showSnackBar('Server error. Please try again.');
} catch (e) {
  // Unknown error
  showSnackBar('Unexpected error: $e');
}
```

## Offline Considerations

```dart
// Check connectivity before showing real-time data
final isOnline = ref.watch(connectivityMonitorProvider);

if (!isOnline) {
  // Show cached data with offline indicator
  return Column(
    children: [
      OfflineBanner(),
      CachedInterventionsView(),
    ],
  );
}

// Create interventions offline
// They'll automatically get queued and synced
await ref.read(activeInterventionsProvider.notifier)
    .createIntervention(intervention);
// Returns immediately, queued for sync

// Status updates offline
await ref.read(activeInterventionsProvider.notifier)
    .updateStatus(interventionId, newStatus);
// Also queued for sync
```

## Performance Tips

1. **Use computed providers** for derived data instead of rebuilding
2. **Auto-dispose family providers** when navigating away
3. **Batch create** multiple interventions for efficiency
4. **Filter server-side** when possible (use query params)
5. **Cache aggressively** to reduce network calls
6. **Debounce filter changes** to prevent excessive rebuilds

## Testing

```dart
// Test intervention creation
testWidgets('Creates intervention from suggestion', (tester) async {
  final container = ProviderContainer(
    overrides: [
      activeInterventionsProvider.overrideWith(
        () => MockActiveInterventionsNotifier(),
      ),
    ],
  );

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: CreateInterventionForm(
        studentId: 'student123',
        suggestion: mockSuggestion,
      ),
    ),
  );

  await tester.enterText(
    find.byType(TextFormField).first,
    'Daily Check-in',
  );

  await tester.tap(find.text('Create Intervention'));
  await tester.pumpAndSettle();

  verify(container.read(activeInterventionsProvider.notifier)
      .createIntervention(any)).called(1);
});
```

## Common Patterns

### Load All Data for Student

```dart
Future<void> loadAllInterventionData(String studentId) async {
  // Get risk factors first
  final profile = await ref.read(
    studentRiskProfileProvider(studentId).future
  );
  final riskFactors = profile.currentRisk.topRiskFactors
      .map((f) => f.feature)
      .toList();

  // Load AI recommendations
  await ref.read(recommendedInterventionsProvider.notifier)
      .loadRecommendations(studentId, riskFactors: riskFactors);

  // Load active interventions
  await ref.read(activeInterventionsProvider.notifier)
      .loadActiveInterventions(studentId);

  // Load history
  await ref.read(interventionHistoryProvider.notifier)
      .loadHistory(studentId);
}
```

### Refresh All Data

```dart
Future<void> refreshInterventionData() async {
  final studentId = ref.read(currentStudentProvider).id;

  await Future.wait([
    ref.refresh(recommendedInterventionsProvider.notifier)
        .loadRecommendations(studentId),
    ref.refresh(activeInterventionsProvider.notifier)
        .loadActiveInterventions(studentId),
    ref.refresh(interventionHistoryProvider.notifier)
        .loadHistory(studentId),
  ]);
}
```

## Troubleshooting

**Q: AI recommendations not loading?**

- Check if risk factors are provided
- Verify API endpoint is correct
- Check network connectivity
- Look for cached data in local database

**Q: Intervention not syncing?**

- Verify connectivity
- Check sync queue status
- Look for temporary IDs (starts with `temp_`)
- Check sync service logs

**Q: Providers not updating UI?**

- Ensure you're using `ref.watch()` not `ref.read()`
- Check if provider is auto-disposed
- Verify notifier methods call `state = ...`
- Look for build method errors

**Q: Offline data not appearing?**

- Check cache methods in local_database.dart
- Verify JSON serialization works
- Check database initialization
- Look for cache expiration logic

## Best Practices

1. ✅ **Load risk factors before recommendations**
2. ✅ **Always handle offline scenarios**
3. ✅ **Validate user input before creating interventions**
4. ✅ **Log outcomes when completing interventions**
5. ✅ **Use computed providers for derived data**
6. ✅ **Provide visual feedback for async operations**
7. ✅ **Show offline indicators when network unavailable**
8. ✅ **Link interventions to risk recommendations when possible**
9. ✅ **Use batch operations for multiple interventions**
10. ✅ **Clean up resources with auto-dispose**

---

**Need Help?** See [INTERVENTION_SYSTEM_SUMMARY.md](INTERVENTION_SYSTEM_SUMMARY.md) for complete technical documentation.
