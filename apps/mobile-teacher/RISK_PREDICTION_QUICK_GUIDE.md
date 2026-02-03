# Risk Prediction System - Quick Implementation Guide

## Phase 1: Data Layer (✅ COMPLETE)

This guide shows how to use the newly implemented Risk Prediction System in your Flutter screens.

## Setup

The risk prediction system is already integrated with the existing provider infrastructure. No additional setup required.

## Basic Usage

### 1. Student Risk Profile

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/risk_prediction.dart';
import '../providers/risk_provider.dart';

class StudentRiskScreen extends ConsumerWidget {
  final String studentId;

  const StudentRiskScreen({required this.studentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Load the profile when screen opens
    final profileNotifier = ref.read(studentRiskProfileProvider.notifier);

    useEffect(() {
      profileNotifier.loadProfile(studentId, period: 'month');
      return null;
    }, [studentId]);

    // Watch the profile state
    final profileAsync = ref.watch(studentRiskProfileProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Student Risk Profile')),
      body: profileAsync.when(
        data: (profile) => _buildProfileView(profile),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(error: error.toString()),
      ),
    );
  }

  Widget _buildProfileView(StudentRiskProfile profile) {
    return ListView(
      children: [
        // Current risk score
        RiskScoreCard(
          score: profile.currentRisk.riskScorePercent,
          level: profile.currentRisk.riskLevel,
          confidence: profile.currentRisk.confidencePercent,
        ),

        // Trend analysis
        TrendCard(
          trend: profile.trendAnalysis.direction,
          magnitude: profile.trendAnalysis.magnitude,
          isConcerning: profile.trendAnalysis.isConcerning,
        ),

        // Active indicators
        if (profile.activeIndicators.isNotEmpty)
          IndicatorsList(indicators: profile.activeIndicators),

        // Historical chart
        HistoricalRiskChart(data: profile.historicalData),
      ],
    );
  }
}
```

### 2. Class Risk Overview

```dart
class ClassRiskDashboard extends ConsumerStatefulWidget {
  final String classId;

  const ClassRiskDashboard({required this.classId});

  @override
  ConsumerState<ClassRiskDashboard> createState() => _ClassRiskDashboardState();
}

class _ClassRiskDashboardState extends ConsumerState<ClassRiskDashboard> {
  @override
  void initState() {
    super.initState();
    // Load class overview
    Future.microtask(() {
      ref.read(classRiskSummaryProvider.notifier).loadOverview(widget.classId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(classRiskSummaryProvider);

    if (state.isLoading) {
      return Center(child: CircularProgressIndicator());
    }

    if (state.error != null) {
      return ErrorView(error: state.error!);
    }

    final overview = state.overview;
    if (overview == null) {
      return Center(child: Text('No data available'));
    }

    return Column(
      children: [
        // Summary stats
        RiskSummaryCard(
          totalStudents: overview.summary.totalStudents,
          needingAttention: overview.summary.studentsNeedingAttention,
          distribution: overview.summary.riskDistribution,
        ),

        // Trending summary
        TrendingSummaryCard(
          improving: overview.trendingSummary.improving,
          worsening: overview.trendingSummary.worsening,
          stable: overview.trendingSummary.stable,
        ),

        // Urgent students
        if (overview.urgentStudents.isNotEmpty)
          UrgentStudentsList(students: overview.urgentStudents),

        // Top indicators
        TopIndicatorsWidget(indicators: overview.topIndicators),
      ],
    );
  }
}
```

### 3. Predictive Indicators

```dart
class PredictiveIndicatorsScreen extends ConsumerWidget {
  final String studentId;

  const PredictiveIndicatorsScreen({required this.studentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Fetch indicators with filters
    final indicatorsAsync = ref.watch(
      predictiveIndicatorsProvider((
        studentId: studentId,
        category: RiskCategory.academic,
        minSeverity: RiskSeverity.medium,
      ))
    );

    return Scaffold(
      appBar: AppBar(title: Text('Early Warning Indicators')),
      body: indicatorsAsync.when(
        data: (indicators) {
          if (indicators.isEmpty) {
            return Center(child: Text('No indicators found'));
          }

          return ListView.builder(
            itemCount: indicators.length,
            itemBuilder: (context, index) {
              final indicator = indicators[index];
              return IndicatorCard(
                name: indicator.name,
                currentValue: indicator.currentValue,
                threshold: indicator.threshold,
                isTriggered: indicator.isTriggered,
                severity: indicator.severity,
                recommendation: indicator.recommendation,
              );
            },
          );
        },
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(error: error.toString()),
      ),
    );
  }
}
```

### 4. Risk Filtering

```dart
class FilterableRiskList extends ConsumerWidget {
  final List<PredictiveIndicator> allIndicators;

  const FilterableRiskList({required this.allIndicators});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch current filter state
    final filter = ref.watch(riskFilterProvider);

    // Apply filters
    final filtered = ref.watch(
      filteredPredictiveIndicatorsProvider(allIndicators)
    );

    return Column(
      children: [
        // Filter controls
        FilterBar(
          currentFilter: filter,
          onRiskTypeChanged: (type) {
            ref.read(riskFilterProvider.notifier).setRiskType(type);
          },
          onSeverityChanged: (severity) {
            ref.read(riskFilterProvider.notifier).setSeverity(severity);
          },
          onClearFilters: () {
            ref.read(riskFilterProvider.notifier).clearFilters();
          },
        ),

        // Filtered list
        Expanded(
          child: ListView.builder(
            itemCount: filtered?.length ?? 0,
            itemBuilder: (context, index) {
              return IndicatorTile(indicator: filtered![index]);
            },
          ),
        ),
      ],
    );
  }
}
```

### 5. Historical Data & Charts

```dart
class RiskHistoryChart extends ConsumerWidget {
  final String studentId;

  const RiskHistoryChart({required this.studentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final startDate = now.subtract(Duration(days: 30));

    final dataAsync = ref.watch(
      historicalRiskDataProvider((
        studentId: studentId,
        startDate: startDate,
        endDate: now,
        aggregation: 'daily',
      ))
    );

    return dataAsync.when(
      data: (historicalData) {
        return Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Risk Score Trend (Last 30 Days)',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                SizedBox(height: 16),

                // Summary stats
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatChip(
                      label: 'Average',
                      value: '${historicalData.averageScore.toStringAsFixed(1)}%',
                    ),
                    _StatChip(
                      label: 'Max',
                      value: '${historicalData.maxScore.toStringAsFixed(1)}%',
                    ),
                    _StatChip(
                      label: 'Min',
                      value: '${historicalData.minScore.toStringAsFixed(1)}%',
                    ),
                  ],
                ),

                SizedBox(height: 16),

                // Chart (use fl_chart or other charting library)
                SizedBox(
                  height: 200,
                  child: LineChart(
                    dataPoints: historicalData.dataPoints,
                  ),
                ),
              ],
            ),
          ),
        );
      },
      loading: () => Center(child: CircularProgressIndicator()),
      error: (error, stack) => ErrorView(error: error.toString()),
    );
  }
}
```

### 6. Risk Trends Analysis

```dart
class TrendAnalysisWidget extends ConsumerWidget {
  final String studentId;

  const TrendAnalysisWidget({required this.studentId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final trendsAsync = ref.watch(
      riskTrendsProvider((
        studentId: studentId,
        startDate: now.subtract(Duration(days: 30)),
        endDate: now,
      ))
    );

    return trendsAsync.when(
      data: (trends) {
        return Card(
          color: trends.isConcerning ? Colors.orange.shade50 : null,
          child: ListTile(
            leading: Icon(
              _getTrendIcon(trends.direction),
              color: _getTrendColor(trends.direction),
            ),
            title: Text('Risk Trend: ${trends.direction.label}'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Magnitude: ${(trends.magnitude * 100).toStringAsFixed(1)}%'),
                Text('Consistency: ${(trends.consistency * 100).toStringAsFixed(0)}%'),
                if (trends.projectedLevel != null)
                  Text(
                    'Projected: ${trends.projectedLevel!.label}',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
              ],
            ),
            trailing: trends.isConcerning
                ? Icon(Icons.warning, color: Colors.orange)
                : null,
          ),
        );
      },
      loading: () => Center(child: CircularProgressIndicator()),
      error: (error, stack) => ErrorView(error: error.toString()),
    );
  }

  IconData _getTrendIcon(RiskTrend trend) {
    switch (trend) {
      case RiskTrend.increasing:
        return Icons.trending_up;
      case RiskTrend.decreasing:
        return Icons.trending_down;
      case RiskTrend.stable:
        return Icons.trending_flat;
    }
  }

  Color _getTrendColor(RiskTrend trend) {
    switch (trend) {
      case RiskTrend.increasing:
        return Colors.red;
      case RiskTrend.decreasing:
        return Colors.green;
      case RiskTrend.stable:
        return Colors.blue;
    }
  }
}
```

## Offline Support

All providers automatically handle offline scenarios:

```dart
// The repository handles offline gracefully
try {
  final profile = await ref.read(riskRepositoryProvider)
      .fetchStudentRiskProfile(studentId);
  // Will return cached data if offline
} catch (e) {
  // Only throws if both API fails AND no cache available
  showError('Unable to load risk profile');
}
```

## Error Handling

```dart
class ErrorAwareRiskWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(studentRiskProfileProvider);

    return profileAsync.when(
      data: (profile) => ProfileView(profile),
      loading: () => LoadingView(),
      error: (error, stack) {
        if (error.toString().contains('offline')) {
          return OfflineWarning();
        } else if (error.toString().contains('permission')) {
          return PermissionError();
        } else {
          return GenericError(message: error.toString());
        }
      },
    );
  }
}
```

## Performance Tips

### 1. Use autoDispose for temporary screens

```dart
// Already implemented in family providers
final dataAsync = ref.watch(
  historicalRiskDataProvider(...) // Auto-disposed when widget unmounts
);
```

### 2. Refresh data strategically

```dart
// Manual refresh
ref.read(studentRiskProfileProvider.notifier).refresh();

// Periodic refresh
Timer.periodic(Duration(minutes: 5), (_) {
  ref.read(classRiskSummaryProvider.notifier).refresh();
});
```

### 3. Batch operations

```dart
// Use batch API for multiple students
final predictions = await ref.read(riskRepositoryProvider)
    .getBatchRiskPredictions(studentIds);
```

## Next Steps

1. **Implement UI screens** using these examples
2. **Add charts** using fl_chart or similar library
3. **Connect real-time alerts** via WebSocket
4. **Add push notifications** for critical alerts

## Support

For questions or issues, refer to:

- [RISK_PREDICTION_PHASE1_SUMMARY.md](./RISK_PREDICTION_PHASE1_SUMMARY.md) - Complete implementation details
- [lib/models/risk_prediction.dart](./lib/models/risk_prediction.dart) - Model definitions
- [lib/repositories/risk_repository.dart](./lib/repositories/risk_repository.dart) - Data access layer
- [lib/providers/risk_provider.dart](./lib/providers/risk_provider.dart) - State management
