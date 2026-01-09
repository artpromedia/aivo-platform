import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';
import 'package:google_fonts/google_fonts.dart';

class DesignSystemGalleryScreen extends ConsumerStatefulWidget {
  const DesignSystemGalleryScreen({super.key});

  @override
  ConsumerState<DesignSystemGalleryScreen> createState() => _DesignSystemGalleryScreenState();
}

class _DesignSystemGalleryScreenState extends ConsumerState<DesignSystemGalleryScreen> {
  bool dyslexiaFont = false;

  ThemeData _maybeDyslexia(ThemeData base) {
    if (!dyslexiaFont) return base;
    return base.copyWith(
      textTheme: GoogleFonts.atkinsonHyperlegibleTextTheme(base.textTheme),
    );
  }

  @override
  Widget build(BuildContext context) {
    final band = ref.watch(gradeThemeControllerProvider);
    final controller = ref.read(gradeThemeControllerProvider.notifier);
    final theme = ref.watch(gradeThemeProvider);

    return Theme(
      data: _maybeDyslexia(theme),
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Design System Gallery'),
          actions: [
            Switch(
              value: dyslexiaFont,
              onChanged: (value) => setState(() => dyslexiaFont = value),
              activeThumbColor: theme.colorScheme.primary,
            ),
            const Padding(
              padding: EdgeInsets.only(right: 12.0),
              child: Center(child: Text('Dyslexia font')),
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: AivoGradeBand.values.map((g) {
                  final selected = g == band;
                  return ChoiceChip(
                    label: Text(_labelFor(g)),
                    selected: selected,
                    onSelected: (_) => controller.setGradeBand(g),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
              _Section(title: 'Buttons', children: [
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    ElevatedButton(onPressed: () => _showDemoSnackbar(context, 'Primary'), child: const Text('Primary')),
                    FilledButton(onPressed: () => _showDemoSnackbar(context, 'Filled'), child: const Text('Filled')),
                    OutlinedButton(onPressed: () => _showDemoSnackbar(context, 'Outlined'), child: const Text('Outlined')),
                    TextButton(onPressed: () => _showDemoSnackbar(context, 'Text'), child: const Text('Text')),
                  ],
                ),
              ]),
              _Section(title: 'Cards', children: [
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    _DemoCard(title: 'Progress', body: 'Per-student progress snapshot'),
                    _DemoCard(title: 'Reminder', body: 'Next session due tomorrow'),
                  ],
                ),
              ]),
              _Section(title: 'Chips', children: [
                Wrap(
                  spacing: 10,
                  children: const [
                    Chip(label: Text('Info')),
                    Chip(label: Text('Success')),
                    Chip(label: Text('Warning')),
                    Chip(label: Text('Error')),
                  ],
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  String _labelFor(AivoGradeBand band) {
    switch (band) {
      case AivoGradeBand.k5:
        return 'K-5';
      case AivoGradeBand.g6_8:
        return '6-8';
      case AivoGradeBand.g9_12:
        return '9-12';
    }
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

void _showDemoSnackbar(BuildContext context, String buttonName) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('$buttonName button pressed')),
  );
}

class _DemoCard extends StatelessWidget {
  const _DemoCard({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(body, style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: () => _showDemoSnackbar(context, 'Action'), child: const Text('Action')),
          ],
        ),
      ),
    );
  }
}
