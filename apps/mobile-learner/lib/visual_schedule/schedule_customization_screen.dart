/// Schedule Customization Screen - ND-1.3
///
/// User preference editor for visual schedule display and behavior.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'schedule_models.dart';
import 'schedule_provider.dart';

/// Screen for customizing schedule preferences
class ScheduleCustomizationScreen extends ConsumerStatefulWidget {
  const ScheduleCustomizationScreen({super.key});

  @override
  ConsumerState<ScheduleCustomizationScreen> createState() =>
      _ScheduleCustomizationScreenState();
}

class _ScheduleCustomizationScreenState
    extends ConsumerState<ScheduleCustomizationScreen> {
  late SchedulePreferences _preferences;
  bool _hasChanges = false;

  @override
  void initState() {
    super.initState();
    // Get current preferences from provider
    final state = ref.read(scheduleNotifierProvider);
    _preferences = state.preferences ?? _defaultPreferences();
  }

  SchedulePreferences _defaultPreferences() {
    return SchedulePreferences(
      displayStyle: ScheduleDisplayStyle.verticalList,
      showTime: true,
      showDuration: true,
      showProgressBar: true,
      highlightCurrentItem: true,
      enableAnimations: true,
      itemSize: 'medium',
      colorScheme: 'default',
      transitionWarningMinutes: 5,
      showTransitionTimer: true,
      playTransitionSound: false,
      vibrationFeedback: true,
      celebrateCompletion: true,
      allowReordering: false,
      showSubItems: true,
    );
  }

  void _updatePreference(SchedulePreferences Function() updater) {
    setState(() {
      _preferences = updater();
      _hasChanges = true;
    });
  }

  Future<void> _savePreferences() async {
    await ref.read(scheduleNotifierProvider.notifier).updatePreferences({
          'displayStyle': _preferences.displayStyle.name,
          'showTime': _preferences.showTime,
          'showDuration': _preferences.showDuration,
          'showProgressBar': _preferences.showProgressBar,
          'highlightCurrentItem': _preferences.highlightCurrentItem,
          'enableAnimations': _preferences.enableAnimations,
          'itemSize': _preferences.itemSize,
          'colorScheme': _preferences.colorScheme,
          'transitionWarningMinutes': _preferences.transitionWarningMinutes,
          'showTransitionTimer': _preferences.showTransitionTimer,
          'playTransitionSound': _preferences.playTransitionSound,
          'vibrationFeedback': _preferences.vibrationFeedback,
          'celebrateCompletion': _preferences.celebrateCompletion,
          'allowReordering': _preferences.allowReordering,
          'showSubItems': _preferences.showSubItems,
        });

    if (mounted) {
      setState(() => _hasChanges = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Preferences saved!'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customize Schedule'),
        actions: [
          if (_hasChanges)
            TextButton(
              onPressed: _savePreferences,
              child: const Text(
                'Save',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSectionHeader('Display Style'),
          _buildDisplayStyleSelector(),
          const SizedBox(height: 24),
          _buildSectionHeader('Appearance'),
          _buildAppearanceOptions(),
          const SizedBox(height: 24),
          _buildSectionHeader('Item Size'),
          _buildItemSizeSelector(),
          const SizedBox(height: 24),
          _buildSectionHeader('Color Theme'),
          _buildColorSchemeSelector(),
          const SizedBox(height: 24),
          _buildSectionHeader('Transitions'),
          _buildTransitionOptions(),
          const SizedBox(height: 24),
          _buildSectionHeader('Feedback'),
          _buildFeedbackOptions(),
          const SizedBox(height: 24),
          _buildSectionHeader('Behavior'),
          _buildBehaviorOptions(),
          const SizedBox(height: 32),
          _buildResetButton(),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
        semanticsLabel: '$title section',
      ),
    );
  }

  Widget _buildDisplayStyleSelector() {
    return Column(
      children: [
        _buildDisplayStyleOption(
          ScheduleDisplayStyle.verticalList,
          'Vertical List',
          Icons.view_list,
          'Activities stacked top to bottom',
        ),
        _buildDisplayStyleOption(
          ScheduleDisplayStyle.horizontalStrip,
          'Horizontal Strip',
          Icons.view_carousel,
          'Activities in a row, left to right',
        ),
        _buildDisplayStyleOption(
          ScheduleDisplayStyle.grid,
          'Grid',
          Icons.grid_view,
          'Activities in a grid layout',
        ),
        _buildDisplayStyleOption(
          ScheduleDisplayStyle.firstThen,
          'First/Then Board',
          Icons.arrow_forward,
          'Shows what\'s now and what\'s next',
        ),
        _buildDisplayStyleOption(
          ScheduleDisplayStyle.nowNextLater,
          'Now/Next/Later',
          Icons.timeline,
          'Shows current, upcoming, and later activities',
        ),
      ],
    );
  }

  Widget _buildDisplayStyleOption(
    ScheduleDisplayStyle style,
    String label,
    IconData icon,
    String description,
  ) {
    final isSelected = _preferences.displayStyle == style;

    return Semantics(
      label: '$label: $description',
      selected: isSelected,
      child: GestureDetector(
        onTap: () => _updatePreference(
          () => _preferences.copyWith(displayStyle: style),
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isSelected ? Colors.blue.shade50 : Colors.white,
            border: Border.all(
              color: isSelected ? Colors.blue : Colors.grey.shade300,
              width: isSelected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.blue : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: isSelected ? Colors.white : Colors.grey.shade600,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.blue : Colors.black87,
                      ),
                    ),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(Icons.check_circle, color: Colors.blue),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppearanceOptions() {
    return Column(
      children: [
        _buildSwitchOption(
          'Show Time',
          'Display time for each activity',
          Icons.access_time,
          _preferences.showTime,
          (value) => _updatePreference(
            () => _preferences.copyWith(showTime: value),
          ),
        ),
        _buildSwitchOption(
          'Show Duration',
          'Display how long each activity takes',
          Icons.timer,
          _preferences.showDuration,
          (value) => _updatePreference(
            () => _preferences.copyWith(showDuration: value),
          ),
        ),
        _buildSwitchOption(
          'Show Progress Bar',
          'Display overall schedule progress',
          Icons.linear_scale,
          _preferences.showProgressBar,
          (value) => _updatePreference(
            () => _preferences.copyWith(showProgressBar: value),
          ),
        ),
        _buildSwitchOption(
          'Highlight Current Item',
          'Make the current activity stand out',
          Icons.highlight,
          _preferences.highlightCurrentItem,
          (value) => _updatePreference(
            () => _preferences.copyWith(highlightCurrentItem: value),
          ),
        ),
        _buildSwitchOption(
          'Show Sub-Items',
          'Display activity breakdown steps',
          Icons.list,
          _preferences.showSubItems,
          (value) => _updatePreference(
            () => _preferences.copyWith(showSubItems: value),
          ),
        ),
        _buildSwitchOption(
          'Enable Animations',
          'Smooth transitions between states',
          Icons.animation,
          _preferences.enableAnimations,
          (value) => _updatePreference(
            () => _preferences.copyWith(enableAnimations: value),
          ),
        ),
      ],
    );
  }

  Widget _buildSwitchOption(
    String title,
    String subtitle,
    IconData icon,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return Semantics(
      label: '$title: $subtitle',
      toggled: value,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: SwitchListTile(
          title: Text(title),
          subtitle: Text(
            subtitle,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          secondary: Icon(icon, color: Colors.grey.shade600),
          value: value,
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildItemSizeSelector() {
    return Row(
      children: [
        _buildSizeOption('small', 'Small', 40),
        const SizedBox(width: 12),
        _buildSizeOption('medium', 'Medium', 56),
        const SizedBox(width: 12),
        _buildSizeOption('large', 'Large', 72),
      ],
    );
  }

  Widget _buildSizeOption(String size, String label, double previewHeight) {
    final isSelected = _preferences.itemSize == size;

    return Expanded(
      child: Semantics(
        label: '$label size',
        selected: isSelected,
        child: GestureDetector(
          onTap: () => _updatePreference(
            () => _preferences.copyWith(itemSize: size),
          ),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isSelected ? Colors.blue.shade50 : Colors.white,
              border: Border.all(
                color: isSelected ? Colors.blue : Colors.grey.shade300,
                width: isSelected ? 2 : 1,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Container(
                  height: previewHeight,
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.blue : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.blue : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildColorSchemeSelector() {
    final schemes = [
      ('default', 'Default', [Colors.blue, Colors.green, Colors.orange]),
      ('pastel', 'Pastel', [
        Colors.blue.shade100,
        Colors.green.shade100,
        Colors.orange.shade100
      ]),
      ('high_contrast', 'High Contrast', [Colors.black, Colors.white]),
      ('nature', 'Nature', [Colors.green, Colors.brown, Colors.teal]),
      ('calm', 'Calm', [Colors.blue.shade200, Colors.purple.shade200]),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: schemes.map((scheme) {
          final isSelected = _preferences.colorScheme == scheme.$1;
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Semantics(
              label: '${scheme.$2} color scheme',
              selected: isSelected,
              child: GestureDetector(
                onTap: () => _updatePreference(
                  () => _preferences.copyWith(colorScheme: scheme.$1),
                ),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.blue.shade50 : Colors.white,
                    border: Border.all(
                      color: isSelected ? Colors.blue : Colors.grey.shade300,
                      width: isSelected ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: scheme.$3
                            .map((color) => Container(
                                  width: 20,
                                  height: 20,
                                  margin: const EdgeInsets.only(right: 4),
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.grey.shade300,
                                    ),
                                  ),
                                ))
                            .toList(),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        scheme.$2,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.blue : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTransitionOptions() {
    return Column(
      children: [
        // Warning time slider
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.warning_amber, color: Colors.orange.shade600),
                  const SizedBox(width: 8),
                  const Text(
                    'Transition Warning',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Warn ${_preferences.transitionWarningMinutes} minutes before activity changes',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
              Slider(
                value: _preferences.transitionWarningMinutes.toDouble(),
                min: 1,
                max: 15,
                divisions: 14,
                label: '${_preferences.transitionWarningMinutes} min',
                onChanged: (value) => _updatePreference(
                  () => _preferences.copyWith(
                    transitionWarningMinutes: value.round(),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        _buildSwitchOption(
          'Show Transition Timer',
          'Display countdown to next activity',
          Icons.hourglass_empty,
          _preferences.showTransitionTimer,
          (value) => _updatePreference(
            () => _preferences.copyWith(showTransitionTimer: value),
          ),
        ),
      ],
    );
  }

  Widget _buildFeedbackOptions() {
    return Column(
      children: [
        _buildSwitchOption(
          'Play Transition Sound',
          'Audio alert before activity changes',
          Icons.volume_up,
          _preferences.playTransitionSound,
          (value) => _updatePreference(
            () => _preferences.copyWith(playTransitionSound: value),
          ),
        ),
        _buildSwitchOption(
          'Vibration Feedback',
          'Vibrate on transitions and completions',
          Icons.vibration,
          _preferences.vibrationFeedback,
          (value) => _updatePreference(
            () => _preferences.copyWith(vibrationFeedback: value),
          ),
        ),
        _buildSwitchOption(
          'Celebrate Completion',
          'Show celebration when all activities are done',
          Icons.celebration,
          _preferences.celebrateCompletion,
          (value) => _updatePreference(
            () => _preferences.copyWith(celebrateCompletion: value),
          ),
        ),
      ],
    );
  }

  Widget _buildBehaviorOptions() {
    return Column(
      children: [
        _buildSwitchOption(
          'Allow Reordering',
          'Let me change the order of activities',
          Icons.swap_vert,
          _preferences.allowReordering,
          (value) => _updatePreference(
            () => _preferences.copyWith(allowReordering: value),
          ),
        ),
      ],
    );
  }

  Widget _buildResetButton() {
    return Center(
      child: TextButton.icon(
        onPressed: () {
          setState(() {
            _preferences = _defaultPreferences();
            _hasChanges = true;
          });
        },
        icon: const Icon(Icons.restore),
        label: const Text('Reset to Defaults'),
        style: TextButton.styleFrom(
          foregroundColor: Colors.grey.shade600,
        ),
      ),
    );
  }
}


