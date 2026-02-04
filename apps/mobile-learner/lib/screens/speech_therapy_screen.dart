/// Speech Therapy Screen
///
/// Main screen for speech therapy features including exercises,
/// articulation practice, voice recording, and progress tracking.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../speech_therapy/speech_therapy_service.dart';
import '../speech_therapy/widgets/speech_exercises_tab.dart';
import '../speech_therapy/widgets/articulation_practice_tab.dart';
import '../speech_therapy/widgets/voice_recordings_tab.dart';
import '../speech_therapy/widgets/progress_tracking_tab.dart';

final speechTherapyServiceProvider = Provider<SpeechTherapyService>((ref) {
  return SpeechTherapyService();
});

/// Main speech therapy screen with tab navigation
class SpeechTherapyScreen extends ConsumerStatefulWidget {
  const SpeechTherapyScreen({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<SpeechTherapyScreen> createState() => _SpeechTherapyScreenState();
}

class _SpeechTherapyScreenState extends ConsumerState<SpeechTherapyScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  static const _tabs = [
    _TabInfo('Exercises', Icons.fitness_center),
    _TabInfo('Practice', Icons.mic),
    _TabInfo('Recordings', Icons.library_music),
    _TabInfo('Progress', Icons.trending_up),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Speech Therapy'),
        backgroundColor: theme.colorScheme.primaryContainer,
        bottom: TabBar(
          controller: _tabController,
          tabs: _tabs
              .map((tab) => Tab(
                    icon: Icon(tab.icon),
                    text: tab.label,
                  ))
              .toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          SpeechExercisesTab(learnerId: widget.learnerId),
          ArticulationPracticeTab(learnerId: widget.learnerId),
          VoiceRecordingsTab(learnerId: widget.learnerId),
          ProgressTrackingTab(learnerId: widget.learnerId),
        ],
      ),
    );
  }
}

class _TabInfo {
  final String label;
  final IconData icon;

  const _TabInfo(this.label, this.icon);
}
