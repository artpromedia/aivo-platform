/// E2E Test Custom Matchers
///
/// Custom matchers for Patrol E2E testing assertions.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Matcher for widget being visible on screen
Matcher isVisible() => _IsVisibleMatcher();

class _IsVisibleMatcher extends Matcher {
  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      return item.evaluate().isNotEmpty;
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('is visible');
}

/// Matcher for widget containing text
Matcher containsText(String text) => _ContainsTextMatcher(text);

class _ContainsTextMatcher extends Matcher {
  const _ContainsTextMatcher(this.text);
  final String text;

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is String) {
      return item.contains(text);
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('contains text "$text"');
}

/// Matcher for button being enabled
Matcher isEnabled() => _IsEnabledMatcher();

class _IsEnabledMatcher extends Matcher {
  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      final elements = item.evaluate();
      if (elements.isEmpty) return false;
      final widget = elements.first.widget;
      if (widget is ElevatedButton) return widget.onPressed != null;
      if (widget is TextButton) return widget.onPressed != null;
      if (widget is OutlinedButton) return widget.onPressed != null;
      if (widget is IconButton) return widget.onPressed != null;
    }
    return true;
  }

  @override
  Description describe(Description description) => description.add('is enabled');
}

/// Matcher for button being disabled
Matcher isDisabled() => _IsDisabledMatcher();

class _IsDisabledMatcher extends Matcher {
  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      final elements = item.evaluate();
      if (elements.isEmpty) return false;
      final widget = elements.first.widget;
      if (widget is ElevatedButton) return widget.onPressed == null;
      if (widget is TextButton) return widget.onPressed == null;
      if (widget is OutlinedButton) return widget.onPressed == null;
      if (widget is IconButton) return widget.onPressed == null;
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('is disabled');
}

/// Matcher for loading indicator
Matcher isLoading() => _IsLoadingMatcher();

class _IsLoadingMatcher extends Matcher {
  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      final elements = item.evaluate();
      for (final element in elements) {
        if (element.widget is CircularProgressIndicator ||
            element.widget is LinearProgressIndicator) {
          return true;
        }
      }
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('is loading');
}

/// Matcher for specific color
Matcher hasColor(Color color) => _HasColorMatcher(color);

class _HasColorMatcher extends Matcher {
  const _HasColorMatcher(this.expectedColor);
  final Color expectedColor;

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      final elements = item.evaluate();
      if (elements.isEmpty) return false;
      final widget = elements.first.widget;
      if (widget is Container && widget.color != null) {
        return widget.color == expectedColor;
      }
      if (widget is Icon) {
        return widget.color == expectedColor;
      }
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('has color $expectedColor');
}

/// Matcher for text field with value
Matcher hasTextValue(String value) => _HasTextValueMatcher(value);

class _HasTextValueMatcher extends Matcher {
  const _HasTextValueMatcher(this.expectedValue);
  final String expectedValue;

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      final elements = item.evaluate();
      if (elements.isEmpty) return false;
      final widget = elements.first.widget;
      if (widget is TextField) {
        return widget.controller?.text == expectedValue;
      }
      if (widget is TextFormField) {
        return widget.controller?.text == expectedValue;
      }
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('has text value "$expectedValue"');
}

/// Matcher for widget count
Matcher hasWidgetCount(int count) => _HasWidgetCountMatcher(count);

class _HasWidgetCountMatcher extends Matcher {
  const _HasWidgetCountMatcher(this.expectedCount);
  final int expectedCount;

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      return item.evaluate().length == expectedCount;
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('has $expectedCount widgets');
}

/// Matcher for minimum widget count
Matcher hasMinWidgetCount(int count) => _HasMinWidgetCountMatcher(count);

class _HasMinWidgetCountMatcher extends Matcher {
  const _HasMinWidgetCountMatcher(this.minCount);
  final int minCount;

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      return item.evaluate().length >= minCount;
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('has at least $minCount widgets');
}

/// Matcher for checkbox state
Matcher isChecked() => _CheckboxStateMatcher(true);
Matcher isUnchecked() => _CheckboxStateMatcher(false);

class _CheckboxStateMatcher extends Matcher {
  const _CheckboxStateMatcher(this.expectedState);
  final bool expectedState;

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      final elements = item.evaluate();
      if (elements.isEmpty) return false;
      final widget = elements.first.widget;
      if (widget is Checkbox) {
        return widget.value == expectedState;
      }
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('is ${expectedState ? "checked" : "unchecked"}');
}

/// Matcher for switch state
Matcher isSwitchedOn() => _SwitchStateMatcher(true);
Matcher isSwitchedOff() => _SwitchStateMatcher(false);

class _SwitchStateMatcher extends Matcher {
  const _SwitchStateMatcher(this.expectedState);
  final bool expectedState;

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is Finder) {
      final elements = item.evaluate();
      if (elements.isEmpty) return false;
      final widget = elements.first.widget;
      if (widget is Switch) {
        return widget.value == expectedState;
      }
    }
    return false;
  }

  @override
  Description describe(Description description) =>
      description.add('is ${expectedState ? "on" : "off"}');
}
