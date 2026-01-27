import 'package:flutter/material.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../../config/environment.dart';
import '../../../pin/pin_storage.dart';
import '../sel_models.dart';
import '../sel_service.dart';
import '../widgets/emotion_wheel.dart';
import '../widgets/mood_tracker.dart';

/// Emotion Check-In Screen
///
/// Allows learners to check in with their current mood, identify triggers,
/// and track coping strategies used.
class EmotionCheckInScreen extends StatefulWidget {
  final String learnerId;
  final VoidCallback? onCheckInComplete;

  const EmotionCheckInScreen({
    super.key,
    required this.learnerId,
    this.onCheckInComplete,
  });

  @override
  State<EmotionCheckInScreen> createState() => _EmotionCheckInScreenState();
}

class _EmotionCheckInScreenState extends State<EmotionCheckInScreen> {
  SELService? _selService;
  String _cachedToken = '';

  Mood? _selectedMood;
  int _intensity = 3;
  final Set<String> _selectedTriggers = {};
  final Set<String> _selectedCoping = {};
  final TextEditingController _notesController = TextEditingController();

  List<MoodCheckIn> _history = [];
  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _showSuccess = false;

  @override
  void initState() {
    super.initState();
    _initializeService();
  }

  Future<void> _initializeService() async {
    final storage = PinTokenStorage();
    _cachedToken = await storage.read() ?? '';

    _selService = SELService(
      baseUrl: EnvironmentConfig.selBaseUrl,
      getAuthToken: () => _cachedToken,
      learnerId: widget.learnerId,
    );

    await _loadHistory();
  }

  Future<void> _loadHistory() async {
    if (_selService == null) return;

    setState(() => _isLoading = true);

    try {
      final history = await _selService!.getMoodCheckIns(limit: 7);
      if (mounted) {
        setState(() {
          _history = history;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submitCheckIn() async {
    if (_selService == null || _selectedMood == null) return;

    setState(() => _isSubmitting = true);

    try {
      await _selService!.createMoodCheckIn(
        mood: _selectedMood!,
        intensity: _intensity,
        triggers: _selectedTriggers.isNotEmpty ? _selectedTriggers.toList() : null,
        notes: _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : null,
        copingStrategiesUsed:
            _selectedCoping.isNotEmpty ? _selectedCoping.toList() : null,
      );

      // Reset form
      setState(() {
        _selectedMood = null;
        _intensity = 3;
        _selectedTriggers.clear();
        _selectedCoping.clear();
        _notesController.clear();
        _showSuccess = true;
        _isSubmitting = false;
      });

      // Reload history
      await _loadHistory();

      // Notify parent
      widget.onCheckInComplete?.call();

      // Hide success message after delay
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() => _showSuccess = false);
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save check-in: $e'),
            backgroundColor: AivoBrand.error,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mood Check-In'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Text(
                    'How are you feeling?',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 24),

                  // Emotion Wheel
                  EmotionWheel(
                    selectedMood: _selectedMood,
                    onMoodSelected: (mood) {
                      setState(() => _selectedMood = mood);
                    },
                  ),
                  const SizedBox(height: 24),

                  // Intensity Slider
                  if (_selectedMood != null) ...[
                    _buildIntensitySlider(),
                    const SizedBox(height: 24),
                  ],

                  // Triggers Section
                  _buildTriggersSection(),
                  const SizedBox(height: 24),

                  // Coping Strategies Section
                  _buildCopingSection(),
                  const SizedBox(height: 24),

                  // Notes
                  _buildNotesSection(),
                  const SizedBox(height: 24),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _selectedMood == null || _isSubmitting
                          ? null
                          : _submitCheckIn,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Save Check-In'),
                    ),
                  ),

                  // Success Message
                  if (_showSuccess) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AivoBrand.success.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AivoBrand.success.withOpacity(0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.check_circle, color: AivoBrand.success),
                          const SizedBox(width: 8),
                          const Text('Check-in saved successfully!'),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 32),

                  // Recent History
                  if (_history.isNotEmpty) ...[
                    Text(
                      'Recent Check-Ins',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 12),
                    MoodTracker(checkIns: _history),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildIntensitySlider() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'How strong is this feeling? ($_intensity/5)',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: _selectedMood?.textColor,
            thumbColor: _selectedMood?.textColor,
            overlayColor: _selectedMood?.color.withOpacity(0.2),
          ),
          child: Slider(
            value: _intensity.toDouble(),
            min: 1,
            max: 5,
            divisions: 4,
            onChanged: (value) {
              setState(() => _intensity = value.round());
            },
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Mild', style: TextStyle(color: AivoBrand.gray.shade500, fontSize: 12)),
            Text('Moderate', style: TextStyle(color: AivoBrand.gray.shade500, fontSize: 12)),
            Text('Strong', style: TextStyle(color: AivoBrand.gray.shade500, fontSize: 12)),
          ],
        ),
      ],
    );
  }

  Widget _buildTriggersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'What might have triggered this feeling? (optional)',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: commonTriggers.map((trigger) {
            final isSelected = _selectedTriggers.contains(trigger);
            return FilterChip(
              label: Text(trigger),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedTriggers.add(trigger);
                  } else {
                    _selectedTriggers.remove(trigger);
                  }
                });
              },
              selectedColor: Theme.of(context).primaryColor.withOpacity(0.2),
              checkmarkColor: Theme.of(context).primaryColor,
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildCopingSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'What helped you cope? (optional)',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: quickCopingStrategies.map((strategy) {
            final isSelected = _selectedCoping.contains(strategy);
            return FilterChip(
              label: Text(strategy),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedCoping.add(strategy);
                  } else {
                    _selectedCoping.remove(strategy);
                  }
                });
              },
              selectedColor: AivoBrand.success.withOpacity(0.2),
              checkmarkColor: AivoBrand.success,
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildNotesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Additional notes (optional)',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _notesController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Anything else you want to remember...',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ],
    );
  }
}
