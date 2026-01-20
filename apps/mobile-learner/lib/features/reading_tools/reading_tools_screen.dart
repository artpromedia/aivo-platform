/// Reading Tools Screen
///
/// Main screen for reading support tools including:
/// - Text-to-speech with customizable voices
/// - Word prediction for assisted writing
/// - Reading comprehension strategies
/// - Vocabulary building and flashcards
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Note: flutter_tts, reading_tools_models, and reading_tools_service
// are imported via the widget implementations
import 'widgets/text_to_speech_widget.dart';
import 'widgets/vocabulary_builder_widget.dart';
import 'widgets/word_prediction_widget.dart';
import 'widgets/comprehension_aids_widget.dart';

/// Reading tools tab enum
enum ReadingToolsTab {
  textToSpeech('Listen', Icons.volume_up),
  vocabulary('Words', Icons.book),
  prediction('Write', Icons.edit_note),
  comprehension('Understand', Icons.psychology);

  const ReadingToolsTab(this.label, this.icon);
  final String label;
  final IconData icon;
}

/// Reading Tools Screen
class ReadingToolsScreen extends ConsumerStatefulWidget {
  const ReadingToolsScreen({
    super.key,
    required this.learnerId,
  });

  final String learnerId;

  @override
  ConsumerState<ReadingToolsScreen> createState() => _ReadingToolsScreenState();
}

class _ReadingToolsScreenState extends ConsumerState<ReadingToolsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  // ignore: unused_field - used in listener for state tracking
  ReadingToolsTab _currentTab = ReadingToolsTab.textToSpeech;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: ReadingToolsTab.values.length,
      vsync: this,
    );
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _currentTab = ReadingToolsTab.values[_tabController.index];
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Using theme in TabBar below
    final _ = theme.colorScheme; // Available for future styling

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reading Tools'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: ReadingToolsTab.values.map((tab) {
            return Tab(
              icon: Icon(tab.icon),
              text: tab.label,
            );
          }).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          TextToSpeechWidget(learnerId: widget.learnerId),
          VocabularyBuilderWidget(learnerId: widget.learnerId),
          WordPredictionWidget(learnerId: widget.learnerId),
          ComprehensionAidsWidget(learnerId: widget.learnerId),
        ],
      ),
    );
  }
}
