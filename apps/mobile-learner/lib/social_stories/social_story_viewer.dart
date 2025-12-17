/// Social Story Viewer - ND-1.2
///
/// Full-screen viewer for social stories with audio/TTS support,
/// progress tracking, and accessibility features.

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_tts/flutter_tts.dart';

import 'social_story_models.dart';
import 'social_story_service.dart';
import 'story_page_widget.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL STORY VIEWER
// ═══════════════════════════════════════════════════════════════════════════════

/// Full-screen viewer for social stories
class SocialStoryViewer extends ConsumerStatefulWidget {
  const SocialStoryViewer({
    super.key,
    required this.story,
    required this.learnerId,
    this.preferences,
    this.triggerType = StoryTriggerType.manual,
    this.triggerContext = const {},
    this.sessionId,
    this.onComplete,
    this.onClose,
  });

  final SocialStory story;
  final String learnerId;
  final LearnerStoryPreferences? preferences;
  final StoryTriggerType triggerType;
  final Map<String, dynamic> triggerContext;
  final String? sessionId;
  final VoidCallback? onComplete;
  final VoidCallback? onClose;

  @override
  ConsumerState<SocialStoryViewer> createState() => _SocialStoryViewerState();
}

class _SocialStoryViewerState extends ConsumerState<SocialStoryViewer>
    with TickerProviderStateMixin {
  late PageController _pageController;
  late AnimationController _progressController;
  
  final AudioPlayer _audioPlayer = AudioPlayer();
  FlutterTts? _tts;
  
  int _currentPage = 0;
  int _highlightedSentence = -1;
  bool _isPlaying = false;
  bool _showControls = true;
  bool _audioPlayed = false;
  int _replayCount = 0;
  
  DateTime? _startTime;
  final List<Map<String, dynamic>> _interactions = [];
  String? _preEmotionalState;
  String? _postEmotionalState;

  Timer? _autoAdvanceTimer;
  Timer? _hideControlsTimer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _progressController = AnimationController(
      vsync: this,
      duration: Duration(seconds: widget.preferences?.pageDisplayTime ?? 10),
    );
    
    _startTime = DateTime.now();
    _initTts();
    _startAutoAdvance();
    
    // Lock to portrait for better reading experience
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  }

  Future<void> _initTts() async {
    if (widget.preferences?.enableTts ?? true) {
      _tts = FlutterTts();
      await _tts!.setLanguage('en-US');
      await _tts!.setSpeechRate(widget.preferences?.ttsSpeed ?? 1.0);
      
      if (widget.preferences?.ttsVoice != null) {
        await _tts!.setVoice({'name': widget.preferences!.ttsVoice!});
      }
      
      _tts!.setCompletionHandler(() {
        _onSentenceComplete();
      });
    }
  }

  void _startAutoAdvance() {
    if (widget.preferences?.autoAdvance ?? false) {
      _autoAdvanceTimer?.cancel();
      _autoAdvanceTimer = Timer(
        Duration(seconds: widget.preferences?.pageDisplayTime ?? 10),
        () {
          if (_currentPage < widget.story.pageCount - 1) {
            _goToPage(_currentPage + 1);
          }
        },
      );
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _progressController.dispose();
    _audioPlayer.dispose();
    _tts?.stop();
    _autoAdvanceTimer?.cancel();
    _hideControlsTimer?.cancel();
    
    // Restore orientation
    SystemChrome.setPreferredOrientations([]);
    
    super.dispose();
  }

  void _goToPage(int page) {
    if (page < 0 || page >= widget.story.pageCount) return;
    
    _pageController.animateToPage(
      page,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _onPageChanged(int page) {
    setState(() {
      _currentPage = page;
      _highlightedSentence = -1;
    });
    
    _progressController.reset();
    _startAutoAdvance();
    
    // Auto-play audio/TTS for new page
    if (_isPlaying) {
      _playCurrentPage();
    }
  }

  Future<void> _playCurrentPage() async {
    final page = widget.story.pages[_currentPage];
    
    // Try to play audio file first
    if (page.audioNarration != null && (widget.preferences?.enableAudio ?? true)) {
      try {
        await _audioPlayer.play(AssetSource(page.audioNarration!));
        setState(() => _audioPlayed = true);
        return;
      } catch (_) {
        // Fall back to TTS
      }
    }
    
    // Use TTS
    if (_tts != null) {
      await _speakSentences(page.sentences);
    }
  }

  Future<void> _speakSentences(List<StorySentence> sentences) async {
    for (int i = 0; i < sentences.length; i++) {
      if (!_isPlaying) break;
      
      setState(() => _highlightedSentence = i);
      await _tts!.speak(sentences[i].text);
      
      // Wait for completion (handled by completion handler)
      await Future.delayed(const Duration(milliseconds: 500));
    }
  }

  void _onSentenceComplete() {
    if (_highlightedSentence < widget.story.pages[_currentPage].sentences.length - 1) {
      setState(() => _highlightedSentence++);
    } else {
      setState(() => _highlightedSentence = -1);
    }
  }

  void _togglePlayPause() {
    setState(() => _isPlaying = !_isPlaying);
    
    if (_isPlaying) {
      _playCurrentPage();
    } else {
      _audioPlayer.pause();
      _tts?.stop();
    }
  }

  void _replay() {
    setState(() {
      _replayCount++;
      _currentPage = 0;
    });
    _pageController.jumpToPage(0);
    _isPlaying = true;
    _playCurrentPage();
  }

  void _recordInteraction(StoryInteraction interaction, Map<String, dynamic> data) {
    _interactions.add({
      'timestamp': DateTime.now().toIso8601String(),
      'pageId': widget.story.pages[_currentPage].id,
      'interactionType': interaction.type,
      'data': data,
    });
  }

  Future<void> _completeStory() async {
    final service = ref.read(socialStoryServiceProvider);
    final endTime = DateTime.now();
    final duration = endTime.difference(_startTime!).inSeconds;
    
    // Record the view
    try {
      await service.recordStoryView(RecordStoryViewData(
        storyId: widget.story.id,
        learnerId: widget.learnerId,
        sessionId: widget.sessionId,
        triggerType: widget.triggerType,
        triggerContext: widget.triggerContext,
        pagesViewed: _currentPage + 1,
        totalPages: widget.story.pageCount,
        completedAt: endTime,
        durationSeconds: duration,
        replayCount: _replayCount,
        audioPlayed: _audioPlayed,
        interactions: _interactions,
        preEmotionalState: _preEmotionalState,
        postEmotionalState: _postEmotionalState,
      ));
    } catch (e) {
      debugPrint('Failed to record story view: $e');
    }
    
    widget.onComplete?.call();
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => _CompletionDialog(
        story: widget.story,
        onRate: (rating, emotionalState) {
          setState(() => _postEmotionalState = emotionalState);
          _completeStory();
          Navigator.of(context).pop();
          widget.onClose?.call();
        },
        onReplay: () {
          Navigator.of(context).pop();
          _replay();
        },
        onClose: () {
          _completeStory();
          Navigator.of(context).pop();
          widget.onClose?.call();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final preferences = widget.preferences;
    final reducedMotion = preferences?.reducedMotion ?? false;

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: () {
          setState(() => _showControls = !_showControls);
          if (_showControls) {
            _hideControlsTimer?.cancel();
            _hideControlsTimer = Timer(const Duration(seconds: 3), () {
              if (mounted) setState(() => _showControls = false);
            });
          }
        },
        child: Stack(
          children: [
            // Page content
            PageView.builder(
              controller: _pageController,
              onPageChanged: _onPageChanged,
              itemCount: widget.story.pageCount,
              physics: reducedMotion
                  ? const NeverScrollableScrollPhysics()
                  : null,
              itemBuilder: (context, index) {
                return StoryPageWidget(
                  page: widget.story.pages[index],
                  preferences: preferences,
                  highlightedSentenceIndex:
                      index == _currentPage ? _highlightedSentence : null,
                  onInteraction: _recordInteraction,
                );
              },
            ),

            // Controls overlay
            AnimatedOpacity(
              opacity: _showControls ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 200),
              child: _buildControls(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControls() {
    return SafeArea(
      child: Column(
        children: [
          // Top bar
          _TopBar(
            title: widget.story.title,
            currentPage: _currentPage + 1,
            totalPages: widget.story.pageCount,
            onClose: () {
              if (_currentPage == widget.story.pageCount - 1) {
                _showCompletionDialog();
              } else {
                _showExitConfirmation();
              }
            },
          ),

          const Spacer(),

          // Bottom controls
          _BottomControls(
            isPlaying: _isPlaying,
            currentPage: _currentPage,
            totalPages: widget.story.pageCount,
            onPlayPause: _togglePlayPause,
            onPrevious: () => _goToPage(_currentPage - 1),
            onNext: () {
              if (_currentPage < widget.story.pageCount - 1) {
                _goToPage(_currentPage + 1);
              } else {
                _showCompletionDialog();
              }
            },
          ),
        ],
      ),
    );
  }

  void _showExitConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave Story?'),
        content: const Text(
          'You haven\'t finished the story yet. Are you sure you want to leave?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Stay'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              widget.onClose?.call();
            },
            child: const Text('Leave'),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOP BAR
// ═══════════════════════════════════════════════════════════════════════════════

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.title,
    required this.currentPage,
    required this.totalPages,
    required this.onClose,
  });

  final String title;
  final int currentPage;
  final int totalPages;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withOpacity(0.7),
            Colors.transparent,
          ],
        ),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white),
            onPressed: onClose,
            tooltip: 'Close',
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  'Page $currentPage of $totalPages',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 48), // Balance the close button
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════

class _BottomControls extends StatelessWidget {
  const _BottomControls({
    required this.isPlaying,
    required this.currentPage,
    required this.totalPages,
    required this.onPlayPause,
    required this.onPrevious,
    required this.onNext,
  });

  final bool isPlaying;
  final int currentPage;
  final int totalPages;
  final VoidCallback onPlayPause;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final isFirstPage = currentPage == 0;
    final isLastPage = currentPage == totalPages - 1;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            Colors.black.withOpacity(0.7),
            Colors.transparent,
          ],
        ),
      ),
      child: Column(
        children: [
          // Progress indicator
          LinearProgressIndicator(
            value: (currentPage + 1) / totalPages,
            backgroundColor: Colors.white.withOpacity(0.3),
            valueColor: const AlwaysStoppedAnimation(Colors.white),
          ),
          const SizedBox(height: 24),

          // Control buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Previous
              IconButton(
                icon: const Icon(Icons.skip_previous, size: 36),
                color: isFirstPage ? Colors.white38 : Colors.white,
                onPressed: isFirstPage ? null : onPrevious,
                tooltip: 'Previous page',
              ),

              // Play/Pause
              Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  icon: Icon(
                    isPlaying ? Icons.pause : Icons.play_arrow,
                    size: 36,
                  ),
                  color: Colors.black,
                  onPressed: onPlayPause,
                  tooltip: isPlaying ? 'Pause' : 'Play',
                ),
              ),

              // Next / Done
              IconButton(
                icon: Icon(
                  isLastPage ? Icons.check_circle : Icons.skip_next,
                  size: 36,
                ),
                color: Colors.white,
                onPressed: onNext,
                tooltip: isLastPage ? 'Finish' : 'Next page',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETION DIALOG
// ═══════════════════════════════════════════════════════════════════════════════

class _CompletionDialog extends StatefulWidget {
  const _CompletionDialog({
    required this.story,
    required this.onRate,
    required this.onReplay,
    required this.onClose,
  });

  final SocialStory story;
  final void Function(int? rating, String? emotionalState) onRate;
  final VoidCallback onReplay;
  final VoidCallback onClose;

  @override
  State<_CompletionDialog> createState() => _CompletionDialogState();
}

class _CompletionDialogState extends State<_CompletionDialog> {
  int? _selectedRating;
  String? _selectedEmotion;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.celebration, color: Colors.orange),
          SizedBox(width: 8),
          Text('Great Job!'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('You finished "${widget.story.title}"!'),
          const SizedBox(height: 24),

          // Rating
          const Text(
            'Did this story help you?',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              final rating = index + 1;
              return IconButton(
                icon: Icon(
                  _selectedRating != null && _selectedRating! >= rating
                      ? Icons.star
                      : Icons.star_border,
                  color: Colors.amber,
                  size: 32,
                ),
                onPressed: () => setState(() => _selectedRating = rating),
              );
            }),
          ),
          const SizedBox(height: 16),

          // Emotion check
          const Text(
            'How do you feel now?',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _EmotionChip(
                emoji: '😊',
                label: 'Good',
                selected: _selectedEmotion == 'GOOD',
                onTap: () => setState(() => _selectedEmotion = 'GOOD'),
              ),
              _EmotionChip(
                emoji: '😌',
                label: 'Calm',
                selected: _selectedEmotion == 'CALM',
                onTap: () => setState(() => _selectedEmotion = 'CALM'),
              ),
              _EmotionChip(
                emoji: '😐',
                label: 'Okay',
                selected: _selectedEmotion == 'NEUTRAL',
                onTap: () => setState(() => _selectedEmotion = 'NEUTRAL'),
              ),
              _EmotionChip(
                emoji: '😟',
                label: 'Still worried',
                selected: _selectedEmotion == 'ANXIOUS',
                onTap: () => setState(() => _selectedEmotion = 'ANXIOUS'),
              ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton.icon(
          onPressed: widget.onReplay,
          icon: const Icon(Icons.replay),
          label: const Text('Read Again'),
        ),
        FilledButton(
          onPressed: () => widget.onRate(_selectedRating, _selectedEmotion),
          child: const Text('Done'),
        ),
      ],
    );
  }
}

class _EmotionChip extends StatelessWidget {
  const _EmotionChip({
    required this.emoji,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? Theme.of(context).primaryColor : Colors.grey[200],
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: selected ? Colors.white : Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
