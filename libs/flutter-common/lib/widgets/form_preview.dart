import 'package:flutter/material.dart';

import '../theme/aivo_brand.dart';
import '../theme/aivo_theme.dart';
import '../ui/aivo_checkbox.dart';
import '../ui/aivo_select.dart';
import '../ui/aivo_switch.dart';
import '../ui/aivo_text_field.dart';

/// A widget that displays a preview of all form components.
///
/// Useful for design system galleries and visual verification of form
/// styling across platforms.
class FormPreview extends StatefulWidget {
  const FormPreview({
    super.key,
    this.band = AivoGradeBand.k5,
  });

  /// The grade band to display form components for.
  final AivoGradeBand band;

  @override
  State<FormPreview> createState() => _FormPreviewState();
}

class _FormPreviewState extends State<FormPreview> {
  // Text field states
  final _textController = TextEditingController(text: 'Sample text');
  final _errorController = TextEditingController();

  // Select states
  String? _selectedCountry;
  final _countries = [
    const AivoSelectItem(value: 'us', label: 'United States', icon: Icons.flag),
    const AivoSelectItem(value: 'uk', label: 'United Kingdom', icon: Icons.flag),
    const AivoSelectItem(value: 'ca', label: 'Canada', icon: Icons.flag),
    const AivoSelectItem(value: 'au', label: 'Australia', icon: Icons.flag),
    const AivoSelectItem(value: 'de', label: 'Germany', icon: Icons.flag),
  ];

  // Switch states
  bool _switchValue1 = true;
  bool _switchValue2 = false;
  bool _switchValue3 = false;

  // Checkbox states
  bool _checkboxValue1 = true;
  bool _checkboxValue2 = false;
  bool? _checkboxValue3; // Indeterminate

  @override
  void dispose() {
    _textController.dispose();
    _errorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FormHeader(band: widget.band),
        const SizedBox(height: 24),

        // Text Fields section
        _SectionHeader(title: 'Text Fields'),
        const SizedBox(height: 12),
        _TextFieldsSection(
          band: widget.band,
          textController: _textController,
          errorController: _errorController,
        ),
        const SizedBox(height: 32),

        // Select/Dropdown section
        _SectionHeader(title: 'Select / Dropdown'),
        const SizedBox(height: 12),
        _SelectSection(
          band: widget.band,
          selectedCountry: _selectedCountry,
          countries: _countries,
          onCountryChanged: (value) =>
              setState(() => _selectedCountry = value),
        ),
        const SizedBox(height: 32),

        // Switch section
        _SectionHeader(title: 'Switches'),
        const SizedBox(height: 12),
        _SwitchSection(
          band: widget.band,
          value1: _switchValue1,
          value2: _switchValue2,
          value3: _switchValue3,
          onValue1Changed: (v) => setState(() => _switchValue1 = v),
          onValue2Changed: (v) => setState(() => _switchValue2 = v),
          onValue3Changed: (v) => setState(() => _switchValue3 = v),
        ),
        const SizedBox(height: 32),

        // Checkbox section
        _SectionHeader(title: 'Checkboxes'),
        const SizedBox(height: 12),
        _CheckboxSection(
          band: widget.band,
          value1: _checkboxValue1,
          value2: _checkboxValue2,
          value3: _checkboxValue3,
          onValue1Changed: (v) => setState(() => _checkboxValue1 = v ?? false),
          onValue2Changed: (v) => setState(() => _checkboxValue2 = v ?? false),
          onValue3Changed: (v) => setState(() => _checkboxValue3 = v),
        ),
        const SizedBox(height: 32),

        // Focus States info
        _FocusStatesInfo(band: widget.band),
      ],
    );
  }
}

class _FormHeader extends StatelessWidget {
  const _FormHeader({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bandLabel = _getBandLabel(band);
    final inputRadius = _getInputRadius(band);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Form Components',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$bandLabel • Input radius: ${inputRadius.toInt()}px',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  String _getBandLabel(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => 'Explorer (Pre-K–5)',
      AivoGradeBand.g6_8 => 'Navigator (6-8)',
      AivoGradeBand.g9_12 => 'Scholar (9-12)',
    };
  }

  double _getInputRadius(AivoGradeBand band) {
    return switch (band) {
      AivoGradeBand.k5 => AivoBrand.radiusExplorerInput,
      AivoGradeBand.g6_8 => AivoBrand.radiusNavigatorInput,
      AivoGradeBand.g9_12 => AivoBrand.radiusScholarInput,
    };
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
    );
  }
}

class _TextFieldsSection extends StatelessWidget {
  const _TextFieldsSection({
    required this.band,
    required this.textController,
    required this.errorController,
  });

  final AivoGradeBand band;
  final TextEditingController textController;
  final TextEditingController errorController;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Variants row
        Text(
          'Variants',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: AivoTextField(
                label: 'Outlined',
                hint: 'Enter text',
                variant: AivoTextFieldVariant.outlined,
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoTextField(
                label: 'Filled',
                hint: 'Enter text',
                variant: AivoTextFieldVariant.filled,
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoTextField(
                label: 'Underlined',
                hint: 'Enter text',
                variant: AivoTextFieldVariant.underlined,
                gradeBand: band,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Sizes row
        Text(
          'Sizes',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: AivoTextField(
                label: 'Small',
                hint: 'Small input',
                size: AivoTextFieldSize.sm,
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoTextField(
                label: 'Medium',
                hint: 'Medium input',
                size: AivoTextFieldSize.md,
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoTextField(
                label: 'Large',
                hint: 'Large input',
                size: AivoTextFieldSize.lg,
                gradeBand: band,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // States row
        Text(
          'States',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: AivoTextField(
                label: 'With helper',
                hint: 'Enter email',
                helperText: 'We will never share your email',
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoTextField(
                label: 'Error state',
                controller: errorController,
                hint: 'Enter email',
                errorText: 'Please enter a valid email',
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoTextField(
                label: 'Disabled',
                hint: 'Cannot edit',
                enabled: false,
                gradeBand: band,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // With icons
        Text(
          'With Icons',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: AivoTextField(
                label: 'Search',
                hint: 'Search...',
                leadingIcon: Icons.search,
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoTextField(
                label: 'Password',
                hint: 'Enter password',
                obscureText: true,
                trailingIcon: Icons.visibility_off,
                onTrailingIconTap: () {},
                gradeBand: band,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SelectSection extends StatelessWidget {
  const _SelectSection({
    required this.band,
    required this.selectedCountry,
    required this.countries,
    required this.onCountryChanged,
  });

  final AivoGradeBand band;
  final String? selectedCountry;
  final List<AivoSelectItem<String>> countries;
  final ValueChanged<String?> onCountryChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: AivoSelect<String>(
                label: 'Country',
                hint: 'Select a country',
                items: countries,
                value: selectedCountry,
                onChanged: onCountryChanged,
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoSelect<String>(
                label: 'With search',
                hint: 'Search countries',
                items: countries,
                searchable: true,
                searchHint: 'Type to search...',
                leadingIcon: Icons.public,
                gradeBand: band,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: AivoSelect<String>(
                label: 'With error',
                hint: 'Select a country',
                items: countries,
                errorText: 'Please select a country',
                gradeBand: band,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AivoSelect<String>(
                label: 'Disabled',
                hint: 'Cannot select',
                items: countries,
                enabled: false,
                gradeBand: band,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SwitchSection extends StatelessWidget {
  const _SwitchSection({
    required this.band,
    required this.value1,
    required this.value2,
    required this.value3,
    required this.onValue1Changed,
    required this.onValue2Changed,
    required this.onValue3Changed,
  });

  final AivoGradeBand band;
  final bool value1;
  final bool value2;
  final bool value3;
  final ValueChanged<bool> onValue1Changed;
  final ValueChanged<bool> onValue2Changed;
  final ValueChanged<bool> onValue3Changed;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Sizes
        Text(
          'Sizes',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            AivoSwitch(
              value: value1,
              onChanged: onValue1Changed,
              size: AivoSwitchSize.sm,
              gradeBand: band,
            ),
            const SizedBox(width: 24),
            AivoSwitch(
              value: value1,
              onChanged: onValue1Changed,
              size: AivoSwitchSize.md,
              gradeBand: band,
            ),
            const SizedBox(width: 24),
            AivoSwitch(
              value: value1,
              onChanged: onValue1Changed,
              size: AivoSwitchSize.lg,
              gradeBand: band,
            ),
          ],
        ),
        const SizedBox(height: 16),

        // With labels
        Text(
          'With Labels',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        AivoSwitch(
          value: value2,
          onChanged: onValue2Changed,
          label: 'Enable notifications',
          subtitle: 'Receive push notifications for new messages',
          gradeBand: band,
        ),
        const SizedBox(height: 12),
        AivoSwitch(
          value: value3,
          onChanged: onValue3Changed,
          label: 'Dark mode',
          labelPosition: AivoSwitchLabelPosition.start,
          gradeBand: band,
        ),
        const SizedBox(height: 12),
        AivoSwitch(
          value: false,
          onChanged: null,
          label: 'Disabled switch',
          enabled: false,
          gradeBand: band,
        ),
      ],
    );
  }
}

class _CheckboxSection extends StatelessWidget {
  const _CheckboxSection({
    required this.band,
    required this.value1,
    required this.value2,
    required this.value3,
    required this.onValue1Changed,
    required this.onValue2Changed,
    required this.onValue3Changed,
  });

  final AivoGradeBand band;
  final bool value1;
  final bool value2;
  final bool? value3;
  final ValueChanged<bool?> onValue1Changed;
  final ValueChanged<bool?> onValue2Changed;
  final ValueChanged<bool?> onValue3Changed;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Sizes
        Text(
          'Sizes',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            AivoCheckbox(
              value: value1,
              onChanged: onValue1Changed,
              size: AivoCheckboxSize.sm,
              gradeBand: band,
            ),
            const SizedBox(width: 24),
            AivoCheckbox(
              value: value1,
              onChanged: onValue1Changed,
              size: AivoCheckboxSize.md,
              gradeBand: band,
            ),
            const SizedBox(width: 24),
            AivoCheckbox(
              value: value1,
              onChanged: onValue1Changed,
              size: AivoCheckboxSize.lg,
              gradeBand: band,
            ),
          ],
        ),
        const SizedBox(height: 16),

        // States
        Text(
          'States',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            AivoCheckbox(
              value: false,
              onChanged: (_) {},
              gradeBand: band,
            ),
            const SizedBox(width: 16),
            const Text('Unchecked'),
            const SizedBox(width: 32),
            AivoCheckbox(
              value: true,
              onChanged: (_) {},
              gradeBand: band,
            ),
            const SizedBox(width: 16),
            const Text('Checked'),
            const SizedBox(width: 32),
            AivoCheckbox(
              value: null,
              onChanged: (_) {},
              tristate: true,
              gradeBand: band,
            ),
            const SizedBox(width: 16),
            const Text('Indeterminate'),
          ],
        ),
        const SizedBox(height: 16),

        // With labels
        Text(
          'With Labels',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        AivoCheckbox(
          value: value1,
          onChanged: onValue1Changed,
          label: 'I agree to the terms and conditions',
          gradeBand: band,
        ),
        const SizedBox(height: 12),
        AivoCheckbox(
          value: value2,
          onChanged: onValue2Changed,
          label: 'Subscribe to newsletter',
          subtitle: 'Receive weekly updates about new features',
          gradeBand: band,
        ),
        const SizedBox(height: 12),
        AivoCheckbox(
          value: false,
          onChanged: null,
          label: 'Disabled checkbox',
          enabled: false,
          gradeBand: band,
        ),
        const SizedBox(height: 12),
        AivoCheckbox(
          value: true,
          onChanged: (_) {},
          label: 'Error state',
          error: true,
          gradeBand: band,
        ),
      ],
    );
  }
}

class _FocusStatesInfo extends StatelessWidget {
  const _FocusStatesInfo({required this.band});

  final AivoGradeBand band;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AivoBrand.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Focus States & Accessibility',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          _InfoRow(label: 'Focus ring', value: '2px solid primary'),
          _InfoRow(label: 'Focus ring offset', value: '2px'),
          _InfoRow(label: 'Focus color', value: 'theme.colorScheme.primary'),
          _InfoRow(label: 'Error color', value: 'theme.colorScheme.error'),
          _InfoRow(
            label: 'Disabled opacity',
            value: '0.5',
          ),
          const SizedBox(height: 8),
          Text(
            'All form components support keyboard navigation with Tab key.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  fontFamily: 'monospace',
                ),
          ),
        ],
      ),
    );
  }
}

/// Interactive form components comparison widget for design system gallery.
class FormComparisonScreen extends StatefulWidget {
  const FormComparisonScreen({super.key});

  @override
  State<FormComparisonScreen> createState() => _FormComparisonScreenState();
}

class _FormComparisonScreenState extends State<FormComparisonScreen> {
  AivoGradeBand _selectedBand = AivoGradeBand.k5;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Form Components Preview'),
      ),
      body: Column(
        children: [
          // Grade band selector
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Grade Band',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                const SizedBox(height: 8),
                SegmentedButton<AivoGradeBand>(
                  segments: const [
                    ButtonSegment(
                      value: AivoGradeBand.k5,
                      label: Text('Explorer'),
                    ),
                    ButtonSegment(
                      value: AivoGradeBand.g6_8,
                      label: Text('Navigator'),
                    ),
                    ButtonSegment(
                      value: AivoGradeBand.g9_12,
                      label: Text('Scholar'),
                    ),
                  ],
                  selected: {_selectedBand},
                  onSelectionChanged: (value) {
                    setState(() => _selectedBand = value.first);
                  },
                ),
              ],
            ),
          ),
          const Divider(),
          // Form preview
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: FormPreview(band: _selectedBand),
            ),
          ),
        ],
      ),
    );
  }
}
