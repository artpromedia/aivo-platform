/// Switch Access Controller - ND-3.3
///
/// Provides switch-based access for users who cannot use standard touch input.
/// Supports 1-5 switch configurations with scanning patterns.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../motor_profile_provider.dart';

/// Switch access mode determines how the UI is navigated
enum ScanMode {
  /// Auto-scan moves focus automatically
  auto,

  /// Manual scan requires switch press to move
  manual,

  /// Group-item first selects groups, then items
  groupItem,
}

/// A controller for managing switch access navigation
class SwitchAccessController extends ChangeNotifier {
  ScanMode _scanMode = ScanMode.auto;
  Duration _scanInterval = const Duration(milliseconds: 1500);
  int _currentIndex = 0;
  int _groupIndex = 0;
  bool _isInGroup = false;
  bool _isScanning = false;
  Timer? _scanTimer;

  List<SwitchAccessItem> _items = [];
  List<List<SwitchAccessItem>> _groups = [];

  ScanMode get scanMode => _scanMode;
  Duration get scanInterval => _scanInterval;
  int get currentIndex => _currentIndex;
  int get groupIndex => _groupIndex;
  bool get isInGroup => _isInGroup;
  bool get isScanning => _isScanning;

  void configure({
    ScanMode? mode,
    Duration? interval,
    List<SwitchAccessItem>? items,
    List<List<SwitchAccessItem>>? groups,
  }) {
    if (mode != null) _scanMode = mode;
    if (interval != null) _scanInterval = interval;
    if (items != null) _items = items;
    if (groups != null) _groups = groups;
    notifyListeners();
  }

  void startScanning() {
    if (_scanMode != ScanMode.auto) return;

    _isScanning = true;
    _scanTimer?.cancel();
    _scanTimer = Timer.periodic(_scanInterval, (_) {
      _advanceFocus();
    });
    notifyListeners();
  }

  void stopScanning() {
    _isScanning = false;
    _scanTimer?.cancel();
    _scanTimer = null;
    notifyListeners();
  }

  void _advanceFocus() {
    if (_scanMode == ScanMode.groupItem && !_isInGroup) {
      // Scanning through groups
      _groupIndex = (_groupIndex + 1) % _groups.length;
    } else {
      // Scanning through items
      final maxIndex = _isInGroup ? _groups[_groupIndex].length : _items.length;
      _currentIndex = (_currentIndex + 1) % maxIndex;
    }
    HapticFeedback.selectionClick();
    notifyListeners();
  }

  void nextItem() {
    if (_scanMode == ScanMode.auto) return; // Handled by timer
    _advanceFocus();
  }

  void previousItem() {
    if (_scanMode == ScanMode.auto) return;

    if (_scanMode == ScanMode.groupItem && !_isInGroup) {
      _groupIndex = (_groupIndex - 1 + _groups.length) % _groups.length;
    } else {
      final maxIndex = _isInGroup ? _groups[_groupIndex].length : _items.length;
      _currentIndex = (_currentIndex - 1 + maxIndex) % maxIndex;
    }
    HapticFeedback.selectionClick();
    notifyListeners();
  }

  void select() {
    if (_scanMode == ScanMode.groupItem && !_isInGroup) {
      // Enter group
      _isInGroup = true;
      _currentIndex = 0;
      HapticFeedback.lightImpact();
    } else {
      // Activate current item
      final item = _isInGroup
          ? _groups[_groupIndex][_currentIndex]
          : _items[_currentIndex];
      item.onActivate?.call();
      HapticFeedback.mediumImpact();
    }
    notifyListeners();
  }

  void back() {
    if (_scanMode == ScanMode.groupItem && _isInGroup) {
      // Exit group
      _isInGroup = false;
      _currentIndex = 0;
      HapticFeedback.lightImpact();
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _scanTimer?.cancel();
    super.dispose();
  }
}

/// Represents an item that can be accessed via switch
class SwitchAccessItem {
  final String id;
  final String label;
  final VoidCallback? onActivate;
  final Widget? child;

  const SwitchAccessItem({
    required this.id,
    required this.label,
    this.onActivate,
    this.child,
  });
}

/// Widget that provides switch access navigation for its children
class SwitchAccessScope extends StatefulWidget {
  final Widget child;
  final SwitchAccessController? controller;
  final List<SwitchAccessItem> items;
  final ScanMode mode;
  final Duration scanInterval;

  const SwitchAccessScope({
    super.key,
    required this.child,
    this.controller,
    this.items = const [],
    this.mode = ScanMode.auto,
    this.scanInterval = const Duration(milliseconds: 1500),
  });

  @override
  State<SwitchAccessScope> createState() => _SwitchAccessScopeState();

  static SwitchAccessController? of(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<_SwitchAccessInherited>()
        ?.controller;
  }
}

class _SwitchAccessScopeState extends State<SwitchAccessScope> {
  late SwitchAccessController _controller;
  late FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? SwitchAccessController();
    _controller.configure(
      mode: widget.mode,
      interval: widget.scanInterval,
      items: widget.items,
    );
    _focusNode = FocusNode();
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      _controller.dispose();
    }
    _focusNode.dispose();
    super.dispose();
  }

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    // Map keyboard keys to switch actions
    switch (event.logicalKey) {
      case LogicalKeyboardKey.space:
      case LogicalKeyboardKey.enter:
        _controller.select();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.arrowRight:
      case LogicalKeyboardKey.arrowDown:
        _controller.nextItem();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.arrowLeft:
      case LogicalKeyboardKey.arrowUp:
        _controller.previousItem();
        return KeyEventResult.handled;

      case LogicalKeyboardKey.escape:
        _controller.back();
        return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final switchEnabled = motorProfile.switchAccessEnabled;

        if (!switchEnabled) {
          return widget.child;
        }

        return Focus(
          focusNode: _focusNode,
          onKeyEvent: _handleKeyEvent,
          autofocus: true,
          child: _SwitchAccessInherited(
            controller: _controller,
            child: widget.child,
          ),
        );
      },
    );
  }
}

class _SwitchAccessInherited extends InheritedWidget {
  final SwitchAccessController controller;

  const _SwitchAccessInherited({
    required this.controller,
    required super.child,
  });

  @override
  bool updateShouldNotify(_SwitchAccessInherited oldWidget) {
    return controller != oldWidget.controller;
  }
}

/// A button that works with switch access
class SwitchAccessButton extends StatelessWidget {
  final String id;
  final String label;
  final VoidCallback? onPressed;
  final Widget? child;
  final Color? focusColor;
  final Color? backgroundColor;

  const SwitchAccessButton({
    super.key,
    required this.id,
    required this.label,
    this.onPressed,
    this.child,
    this.focusColor,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final controller = SwitchAccessScope.of(context);
    final isFocused = controller != null &&
        (controller._items.isNotEmpty
            ? controller._items[controller.currentIndex].id == id
            : false);

    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;
        final minHeight = 56.0 * multiplier;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          constraints: BoxConstraints(minHeight: minHeight),
          decoration: BoxDecoration(
            color: backgroundColor ?? Colors.grey.shade200,
            borderRadius: BorderRadius.circular(12),
            border: isFocused
                ? Border.all(
                    color: focusColor ?? Colors.blue,
                    width: 4,
                  )
                : null,
            boxShadow: isFocused
                ? [
                    BoxShadow(
                      color: (focusColor ?? Colors.blue).withOpacity(0.4),
                      blurRadius: 12,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onPressed,
              borderRadius: BorderRadius.circular(12),
              child: Padding(
                padding: EdgeInsets.all(16 * multiplier),
                child: child ??
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 16 * multiplier,
                        fontWeight: isFocused ? FontWeight.bold : FontWeight.normal,
                      ),
                      textAlign: TextAlign.center,
                    ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// A grid of items accessible via switch
class SwitchAccessGrid extends StatelessWidget {
  final List<SwitchAccessItem> items;
  final int crossAxisCount;
  final double spacing;

  const SwitchAccessGrid({
    super.key,
    required this.items,
    this.crossAxisCount = 2,
    this.spacing = 12,
  });

  @override
  Widget build(BuildContext context) {
    final controller = SwitchAccessScope.of(context);

    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;

        return ListenableBuilder(
          listenable: controller ?? ChangeNotifier(),
          builder: (context, _) {
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                mainAxisSpacing: spacing * multiplier,
                crossAxisSpacing: spacing * multiplier,
                childAspectRatio: 1.5,
              ),
              itemCount: items.length,
              itemBuilder: (context, index) {
                final item = items[index];
                final isFocused = controller?.currentIndex == index;

                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: isFocused
                        ? Border.all(color: Colors.blue, width: 4)
                        : null,
                    boxShadow: isFocused
                        ? [
                            BoxShadow(
                              color: Colors.blue.withOpacity(0.4),
                              blurRadius: 12,
                              spreadRadius: 2,
                            ),
                          ]
                        : null,
                  ),
                  child: Material(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      onTap: item.onActivate,
                      borderRadius: BorderRadius.circular(12),
                      child: item.child ??
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Text(
                                item.label,
                                style: TextStyle(
                                  fontSize: 14 * multiplier,
                                  fontWeight:
                                      isFocused ? FontWeight.bold : FontWeight.normal,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}

/// Visual overlay showing switch access focus indicator
class SwitchAccessOverlay extends StatelessWidget {
  final Widget child;
  final bool showIndicator;

  const SwitchAccessOverlay({
    super.key,
    required this.child,
    this.showIndicator = true,
  });

  @override
  Widget build(BuildContext context) {
    final controller = SwitchAccessScope.of(context);

    if (controller == null) {
      return child;
    }

    return Stack(
      children: [
        child,

        // Scanning indicator
        if (showIndicator && controller.isScanning)
          Positioned(
            top: 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(width: 6),
                  Text(
                    'Scanning',
                    style: TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Settings panel for configuring switch access
class SwitchAccessSettings extends StatelessWidget {
  final SwitchAccessController controller;

  const SwitchAccessSettings({
    super.key,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MotorProfileProvider>(
      builder: (context, motorProfile, _) {
        final multiplier = motorProfile.touchTargetMultiplier;

        return ListenableBuilder(
          listenable: controller,
          builder: (context, _) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Switch Access Settings',
                  style: TextStyle(
                    fontSize: 18 * multiplier,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 16 * multiplier),

                // Scan mode
                Text(
                  'Scan Mode',
                  style: TextStyle(
                    fontSize: 14 * multiplier,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: 8 * multiplier),
                SegmentedButton<ScanMode>(
                  segments: const [
                    ButtonSegment(value: ScanMode.auto, label: Text('Auto')),
                    ButtonSegment(value: ScanMode.manual, label: Text('Manual')),
                    ButtonSegment(value: ScanMode.groupItem, label: Text('Group')),
                  ],
                  selected: {controller.scanMode},
                  onSelectionChanged: (modes) {
                    controller.configure(mode: modes.first);
                  },
                ),

                SizedBox(height: 16 * multiplier),

                // Scan speed
                Text(
                  'Scan Speed: ${controller.scanInterval.inMilliseconds}ms',
                  style: TextStyle(
                    fontSize: 14 * multiplier,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Slider(
                  value: controller.scanInterval.inMilliseconds.toDouble(),
                  min: 500,
                  max: 3000,
                  divisions: 10,
                  onChanged: (value) {
                    controller.configure(
                      interval: Duration(milliseconds: value.round()),
                    );
                  },
                ),

                SizedBox(height: 16 * multiplier),

                // Start/stop scanning
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: controller.isScanning
                            ? null
                            : () => controller.startScanning(),
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('Start Scanning'),
                      ),
                    ),
                    SizedBox(width: 8 * multiplier),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: controller.isScanning
                            ? () => controller.stopScanning()
                            : null,
                        icon: const Icon(Icons.stop),
                        label: const Text('Stop Scanning'),
                      ),
                    ),
                  ],
                ),
              ],
            );
          },
        );
      },
    );
  }
}

/// External switch input handler (for Bluetooth/USB switches)
class ExternalSwitchHandler extends StatefulWidget {
  final Widget child;
  final void Function()? onSwitch1;
  final void Function()? onSwitch2;
  final void Function()? onSwitch3;
  final void Function()? onSwitch4;
  final void Function()? onSwitch5;

  const ExternalSwitchHandler({
    super.key,
    required this.child,
    this.onSwitch1,
    this.onSwitch2,
    this.onSwitch3,
    this.onSwitch4,
    this.onSwitch5,
  });

  @override
  State<ExternalSwitchHandler> createState() => _ExternalSwitchHandlerState();
}

class _ExternalSwitchHandlerState extends State<ExternalSwitchHandler> {
  // In production, this would connect to HID devices or Bluetooth
  // For now, we map keyboard shortcuts

  static const Map<LogicalKeyboardKey, int> _keyToSwitch = {
    LogicalKeyboardKey.digit1: 1,
    LogicalKeyboardKey.digit2: 2,
    LogicalKeyboardKey.digit3: 3,
    LogicalKeyboardKey.digit4: 4,
    LogicalKeyboardKey.digit5: 5,
    LogicalKeyboardKey.numpad1: 1,
    LogicalKeyboardKey.numpad2: 2,
    LogicalKeyboardKey.numpad3: 3,
    LogicalKeyboardKey.numpad4: 4,
    LogicalKeyboardKey.numpad5: 5,
  };

  KeyEventResult _handleKeyEvent(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    final switchNum = _keyToSwitch[event.logicalKey];
    if (switchNum == null) return KeyEventResult.ignored;

    switch (switchNum) {
      case 1:
        widget.onSwitch1?.call();
        break;
      case 2:
        widget.onSwitch2?.call();
        break;
      case 3:
        widget.onSwitch3?.call();
        break;
      case 4:
        widget.onSwitch4?.call();
        break;
      case 5:
        widget.onSwitch5?.call();
        break;
    }

    HapticFeedback.heavyImpact();
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      onKeyEvent: _handleKeyEvent,
      child: widget.child,
    );
  }
}
