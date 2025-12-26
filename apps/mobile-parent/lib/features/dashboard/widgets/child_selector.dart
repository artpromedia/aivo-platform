import 'package:flutter/material.dart';

class ChildInfo {
  final String id;
  final String name;
  final String? grade;
  final String? avatarUrl;

  ChildInfo({
    required this.id,
    required this.name,
    this.grade,
    this.avatarUrl,
  });
}

class ChildSelector extends StatelessWidget {
  final List<ChildInfo> children;
  final String? selectedId;
  final void Function(String) onSelect;

  const ChildSelector({
    super.key,
    required this.children,
    required this.selectedId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      height: 80,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: children.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final child = children[index];
          final isSelected = child.id == selectedId;

          return GestureDetector(
            onTap: () => onSelect(child.id),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isSelected
                    ? theme.colorScheme.primaryContainer
                    : theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected
                      ? theme.colorScheme.primary
                      : theme.colorScheme.outline.withOpacity(0.3),
                  width: isSelected ? 2 : 1,
                ),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                    backgroundImage: child.avatarUrl != null
                        ? NetworkImage(child.avatarUrl!)
                        : null,
                    child: child.avatarUrl == null
                        ? Text(
                            child.name.isNotEmpty ? child.name[0].toUpperCase() : '?',
                            style: TextStyle(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        child.name,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      if (child.grade != null)
                        Text(
                          'Grade ${child.grade}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
