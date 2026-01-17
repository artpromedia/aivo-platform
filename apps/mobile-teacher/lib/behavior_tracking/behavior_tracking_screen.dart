/// Behavior Tracking Dashboard Screen
///
/// Main screen for behavior tracking with tabs for Incidents, Patterns,
/// Interventions, and Reports.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'incident_logger_screen.dart';
import 'pattern_analysis_screen.dart';
import 'intervention_tools_screen.dart';
import 'reports_screen.dart';

class BehaviorTrackingScreen extends ConsumerStatefulWidget {
  const BehaviorTrackingScreen({
    required this.studentId,
    required this.studentName,
    super.key,
  });

  final String studentId;
  final String studentName;

  @override
  ConsumerState<BehaviorTrackingScreen> createState() =>
      _BehaviorTrackingScreenState();
}

class _BehaviorTrackingScreenState
    extends ConsumerState<BehaviorTrackingScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Behavior Tracking'),
            Text(
              widget.studentName,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withOpacity(0.7),
                  ),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.edit_note), text: 'Incidents'),
            Tab(icon: Icon(Icons.analytics), text: 'Patterns'),
            Tab(icon: Icon(Icons.lightbulb), text: 'Interventions'),
            Tab(icon: Icon(Icons.assessment), text: 'Reports'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          IncidentLoggerScreen(
            studentId: widget.studentId,
            studentName: widget.studentName,
          ),
          PatternAnalysisScreen(
            studentId: widget.studentId,
            studentName: widget.studentName,
          ),
          InterventionToolsScreen(
            studentId: widget.studentId,
            studentName: widget.studentName,
          ),
          BehaviorReportsScreen(
            studentId: widget.studentId,
            studentName: widget.studentName,
          ),
        ],
      ),
    );
  }
}
