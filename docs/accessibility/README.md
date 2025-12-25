# Accessibility Guidelines

## Overview

This document provides comprehensive guidelines for implementing WCAG 2.1 Level AA accessibility across all AIVO platform applications.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Web Applications](#web-applications)
3. [Mobile Applications](#mobile-applications)
4. [Testing](#testing)
5. [Component Patterns](#component-patterns)

## Core Principles

### WCAG 2.1 Level AA Requirements

| Principle | Guideline | Description |
|-----------|-----------|-------------|
| **Perceivable** | Text Alternatives | Provide text alternatives for non-text content |
| | Captions | Provide captions and alternatives for multimedia |
| | Adaptable | Create content that can be presented in different ways |
| | Distinguishable | Make it easy to see and hear content (4.5:1 contrast ratio) |
| **Operable** | Keyboard | Make all functionality available from keyboard |
| | Enough Time | Give users enough time to read and use content |
| | Seizures | Do not design content in a way that causes seizures |
| | Navigable | Provide ways to help users navigate and find content |
| **Understandable** | Readable | Make text readable and understandable |
| | Predictable | Make pages operate in predictable ways |
| | Input Assistance | Help users avoid and correct mistakes |
| **Robust** | Compatible | Maximize compatibility with assistive technologies |

### Screen Reader Support

We support the following screen readers:

- **Desktop**: NVDA, JAWS, VoiceOver (macOS)
- **Mobile**: VoiceOver (iOS), TalkBack (Android)

## Web Applications

### Using the @aivo/a11y Package

```typescript
import {
  // Core utilities
  announce,
  createFocusTrap,
  getFocusableElements,
  KeyboardShortcutManager,
  checkContrast,
  prefersReducedMotion,
  
  // React hooks
  useAnnounce,
  useFocusTrap,
  useReducedMotion,
  useRovingTabindex,
  useKeyboardNavigation,
  
  // Components
  AccessibleDialog,
  AccessibleTabs,
  VisuallyHidden,
  SkipLinks,
} from '@aivo/a11y';
```

### Screen Reader Announcements

```typescript
import { useAnnounce } from '@aivo/a11y';

function SaveButton() {
  const { announceSuccess, announceError } = useAnnounce();

  const handleSave = async () => {
    try {
      await save();
      announceSuccess('Document saved successfully');
    } catch (error) {
      announceError('Failed to save document');
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Focus Management

```typescript
import { useFocusTrap, useFocusReturn } from '@aivo/a11y';

function Modal({ isOpen, onClose }) {
  const containerRef = useFocusTrap(isOpen);
  useFocusReturn(!isOpen);

  if (!isOpen) return null;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  );
}
```

### Keyboard Navigation

```typescript
import { useRovingTabindex } from '@aivo/a11y';

function Menu({ items }) {
  const { containerRef, getItemProps } = useRovingTabindex({
    orientation: 'vertical',
  });

  return (
    <ul ref={containerRef} role="menu">
      {items.map((item, index) => (
        <li key={item.id} role="menuitem" {...getItemProps(index)}>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
```

### Color Contrast

```typescript
import { checkContrast } from '@aivo/a11y';

// Check if colors meet WCAG AA requirements
const result = checkContrast('#1a1a1a', '#ffffff');
console.log(result);
// {
//   ratio: 16.1,
//   passesAA: true,
//   passesAAA: true,
//   passesAALarge: true,
//   passesAAALarge: true
// }
```

### Reduced Motion

```typescript
import { useReducedMotion, useMotionSafeDuration } from '@aivo/a11y';

function AnimatedComponent() {
  const prefersReducedMotion = useReducedMotion();
  const duration = useMotionSafeDuration(300);

  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: duration / 1000 }}
    />
  );
}
```

## Mobile Applications (Flutter)

### Using Flutter Accessibility Utilities

```dart
import 'package:flutter_common/accessibility/accessibility.dart';
```

### Screen Reader Announcements

```dart
// Announce to screen readers
await AccessibilityAnnouncer.announce('Item added to cart');
await AccessibilityAnnouncer.announceError('Please fill in required fields');
await AccessibilityAnnouncer.announceProgress(50, 'Uploading');
```

### Semantic Widgets

```dart
// Accessible button
AccessibleButton(
  label: 'Submit Form',
  hint: 'Double tap to submit your response',
  onPressed: handleSubmit,
  child: Text('Submit'),
)

// Accessible image
AccessibleImage(
  image: AssetImage('assets/logo.png'),
  altText: 'AIVO Learning Platform Logo',
)

// Decorative image (excluded from screen readers)
AccessibleImage(
  image: AssetImage('assets/decoration.png'),
  altText: '',
  isDecorative: true,
)
```

### Respecting User Preferences

```dart
// Check accessibility preferences
if (context.prefersReducedMotion) {
  // Skip animations
}

if (context.prefersHighContrast) {
  // Use high contrast colors
}

// Get animation duration based on preferences
final duration = context.animationDuration(Duration(milliseconds: 300));
```

## Testing

### Automated Testing with axe-core

```typescript
import { testAccessibility, setupA11yMatchers } from '@aivo/a11y/testing';

setupA11yMatchers();

describe('Login Form', () => {
  it('should be accessible', async () => {
    render(<LoginForm />);
    await expect(document.body).toBeAccessible();
  });
});
```

### Running Tests

```bash
# Run accessibility tests
pnpm --filter @aivo/web-teacher test:a11y

# Run Pa11y CI
pa11y-ci --config .pa11yci.json

# Generate accessibility report
pnpm --filter @aivo/a11y report
```

## Component Patterns

### Accessible Dialog

```typescript
<AccessibleDialog
  open={isOpen}
  onClose={handleClose}
  title="Confirm Delete"
  description="Are you sure you want to delete this item?"
>
  <button onClick={handleClose}>Cancel</button>
  <button onClick={handleDelete}>Delete</button>
</AccessibleDialog>
```

### Accessible Tabs

```typescript
<AccessibleTabs
  tabs={[
    { id: 'overview', label: 'Overview', content: <Overview /> },
    { id: 'details', label: 'Details', content: <Details /> },
    { id: 'history', label: 'History', content: <History /> },
  ]}
  aria-label="Course sections"
/>
```

### Skip Links

```typescript
// Add to top of page
<SkipLinks
  links={[
    { href: '#main', label: 'Skip to main content' },
    { href: '#nav', label: 'Skip to navigation' },
    { href: '#search', label: 'Skip to search' },
  ]}
/>
```

### Form Fields

```typescript
<AccessibleInput
  label="Email Address"
  type="email"
  description="We'll never share your email"
  error={errors.email}
  required
/>

<AccessibleSelect
  label="Country"
  options={countries}
  value={country}
  onChange={setCountry}
  error={errors.country}
/>
```

## Checklist

### Before Committing

- [ ] All interactive elements are keyboard accessible
- [ ] Focus is visible and managed correctly
- [ ] Color contrast meets 4.5:1 for text, 3:1 for UI
- [ ] Images have alt text (or marked decorative)
- [ ] Form fields have associated labels
- [ ] Error messages are announced to screen readers
- [ ] Page has proper heading hierarchy
- [ ] Skip links are present for main navigation
- [ ] Animations respect reduced motion preference

### Before Release

- [ ] Automated axe-core tests pass
- [ ] Pa11y CI tests pass
- [ ] Lighthouse accessibility score ≥ 90
- [ ] Manual screen reader testing completed
- [ ] Keyboard-only navigation tested
- [ ] High contrast mode tested
- [ ] Large text mode tested

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Flutter Accessibility](https://docs.flutter.dev/development/accessibility-and-localization/accessibility)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
