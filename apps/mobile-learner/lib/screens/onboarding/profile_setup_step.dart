import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/theme/theme.dart';

import '../../onboarding/onboarding_controller.dart';

/// Profile setup step - collects name, avatar, and grade level.
class ProfileSetupStep extends ConsumerStatefulWidget {
  const ProfileSetupStep({super.key});

  @override
  ConsumerState<ProfileSetupStep> createState() => _ProfileSetupStepState();
}

class _ProfileSetupStepState extends ConsumerState<ProfileSetupStep> {
  late TextEditingController _nameController;
  String? _selectedAvatarId;
  int? _selectedGrade;

  final List<_AvatarOption> _avatars = [
    _AvatarOption('avatar_1', Icons.face, Colors.blue),
    _AvatarOption('avatar_2', Icons.face_2, Colors.purple),
    _AvatarOption('avatar_3', Icons.face_3, AivoBrand.success),
    _AvatarOption('avatar_4', Icons.face_4, AivoBrand.warning),
    _AvatarOption('avatar_5', Icons.face_5, Colors.pink),
    _AvatarOption('avatar_6', Icons.face_6, Colors.teal),
  ];

  @override
  void initState() {
    super.initState();
    final state = ref.read(onboardingControllerProvider);
    _nameController = TextEditingController(text: state.profileData?.displayName ?? '');
    _selectedAvatarId = state.profileData?.avatarId;
    _selectedGrade = state.profileData?.gradeLevel;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  bool get _canProceed => _nameController.text.trim().isNotEmpty;

  void _handleNext() {
    if (!_canProceed) return;

    ref.read(onboardingControllerProvider.notifier).updateProfile(
      displayName: _nameController.text.trim(),
      avatarId: _selectedAvatarId,
      gradeLevel: _selectedGrade,
    );
    ref.read(onboardingControllerProvider.notifier).nextStep();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Center(
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.person_outline,
                    size: 40,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'Tell Us About You',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'We\'ll use this to personalize your experience',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Name input
          Text(
            'What should we call you?',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _nameController,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              hintText: 'Enter your name or nickname',
              prefixIcon: const Icon(Icons.badge_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 24),

          // Avatar selection
          Text(
            'Choose your avatar',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: _avatars.map((avatar) {
              final isSelected = _selectedAvatarId == avatar.id;
              return GestureDetector(
                onTap: () {
                  setState(() => _selectedAvatarId = avatar.id);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? avatar.color.withValues(alpha: 0.2)
                        : theme.colorScheme.surfaceContainerHighest,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? avatar.color : Colors.transparent,
                      width: 3,
                    ),
                  ),
                  child: Icon(
                    avatar.icon,
                    size: 32,
                    color: isSelected ? avatar.color : theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          // Grade selection
          Text(
            'What grade are you in? (Optional)',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(12, (index) {
              final grade = index + 1;
              final isSelected = _selectedGrade == grade;
              return ChoiceChip(
                label: Text('$grade'),
                selected: isSelected,
                onSelected: (selected) {
                  setState(() => _selectedGrade = selected ? grade : null);
                },
              );
            }),
          ),
          const SizedBox(height: 40),

          // Navigation buttons
          Row(
            children: [
              OutlinedButton(
                onPressed: () {
                  ref.read(onboardingControllerProvider.notifier).previousStep();
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(100, 56),
                ),
                child: const Text('Back'),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: FilledButton(
                  onPressed: _canProceed ? _handleNext : null,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 56),
                  ),
                  child: const Text('Continue'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AvatarOption {
  const _AvatarOption(this.id, this.icon, this.color);
  final String id;
  final IconData icon;
  final Color color;
}
