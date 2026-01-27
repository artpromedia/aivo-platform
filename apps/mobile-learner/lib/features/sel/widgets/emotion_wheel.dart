import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../sel_models.dart';

/// Emotion Wheel Widget
///
/// Interactive circular display of emotions for mood check-ins.
class EmotionWheel extends StatelessWidget {
  final Mood? selectedMood;
  final ValueChanged<Mood> onMoodSelected;

  const EmotionWheel({
    super.key,
    this.selectedMood,
    required this.onMoodSelected,
  });

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = constraints.maxWidth;
          final centerSize = size * 0.35;
          final itemSize = size * 0.22;
          final radius = (size - itemSize) / 2 * 0.85;

          return Stack(
            alignment: Alignment.center,
            children: [
              // Background circle
              Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.grey.shade100,
                ),
              ),

              // Mood items arranged in a circle
              ...Mood.values.asMap().entries.map((entry) {
                final index = entry.key;
                final mood = entry.value;
                final angle = (index * 2 * math.pi / Mood.values.length) -
                    math.pi / 2;
                final x = math.cos(angle) * radius;
                final y = math.sin(angle) * radius;

                return Transform.translate(
                  offset: Offset(x, y),
                  child: _MoodButton(
                    mood: mood,
                    size: itemSize,
                    isSelected: selectedMood == mood,
                    onTap: () => onMoodSelected(mood),
                  ),
                );
              }),

              // Center display
              Container(
                width: centerSize,
                height: centerSize,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selectedMood?.color ?? Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      selectedMood?.emoji ?? '🤔',
                      style: TextStyle(fontSize: centerSize * 0.4),
                    ),
                    if (selectedMood != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        selectedMood!.label,
                        style: TextStyle(
                          color: selectedMood!.textColor,
                          fontWeight: FontWeight.bold,
                          fontSize: centerSize * 0.12,
                        ),
                      ),
                    ] else ...[
                      const SizedBox(height: 4),
                      Text(
                        'Select',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: centerSize * 0.1,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _MoodButton extends StatelessWidget {
  final Mood mood;
  final double size;
  final bool isSelected;
  final VoidCallback onTap;

  const _MoodButton({
    required this.mood,
    required this.size,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isSelected ? mood.color : Colors.white,
          border: Border.all(
            color: isSelected ? mood.textColor : Colors.grey.shade300,
            width: isSelected ? 3 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? mood.textColor.withOpacity(0.3)
                  : Colors.black.withOpacity(0.05),
              blurRadius: isSelected ? 8 : 4,
              spreadRadius: isSelected ? 2 : 0,
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              mood.emoji,
              style: TextStyle(fontSize: size * 0.35),
            ),
            const SizedBox(height: 2),
            Text(
              mood.label,
              style: TextStyle(
                fontSize: size * 0.12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? mood.textColor : Colors.grey.shade700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
