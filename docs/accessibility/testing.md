# Accessibility Testing Guide

## Overview

This guide covers automated and manual accessibility testing for the AIVO platform.

## Automated Testing

### Unit Tests with axe-core

The `@aivo/a11y` package provides testing utilities for component-level accessibility testing.

#### Setup

```typescript
// test/setup.ts
import { setupA11yMatchers } from '@aivo/a11y/testing';

beforeAll(() => {
  setupA11yMatchers();
});
```

#### Writing Tests

```typescript
import { render } from '@testing-library/react';
import { testAccessibility } from '@aivo/a11y/testing';
import { Button } from './Button';

describe('Button', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <Button onClick={() => {}}>Click me</Button>
    );
    
    const { passed, summary } = await testAccessibility(container);
    expect(passed).toBe(true);
    console.log(summary);
  });
});
```

### Custom Matchers

```typescript
// toBeAccessible - Full axe-core analysis
await expect(container).toBeAccessible();

// toHaveAccessibleName - Check accessible name
expect(button).toHaveAccessibleName('Submit form');

// toBeFocusable - Check if element can receive focus
expect(link).toBeFocusable();

// toHaveRole - Check ARIA role
expect(nav).toHaveRole('navigation');

// toHaveValidAriaAttributes - Validate ARIA usage
expect(dialog).toHaveValidAriaAttributes();
```

### Testing Specific Patterns

#### Focus Management

```typescript
import { checkFocusManagement } from '@aivo/a11y/testing';

test('dialog traps focus correctly', () => {
  render(<Dialog open />);
  
  const { passed, issues } = checkFocusManagement(
    document.querySelector('[role="dialog"]')!
  );
  
  expect(passed).toBe(true);
  expect(issues).toHaveLength(0);
});
```

#### Keyboard Navigation

```typescript
import { checkKeyboardNavigation } from '@aivo/a11y/testing';

test('menu is keyboard navigable', () => {
  render(<Menu items={menuItems} />);
  
  const { passed, focusableElements } = checkKeyboardNavigation(
    document.querySelector('[role="menu"]')!
  );
  
  expect(passed).toBe(true);
  expect(focusableElements.length).toBeGreaterThan(0);
});
```

#### ARIA Attributes

```typescript
import { checkAriaAttributes } from '@aivo/a11y/testing';

test('form has valid ARIA attributes', () => {
  render(<ContactForm />);
  
  const { passed, issues } = checkAriaAttributes(
    document.querySelector('form')!
  );
  
  expect(passed).toBe(true);
});
```

## CI Integration

### GitHub Actions

The `.github/workflows/accessibility.yml` workflow runs on every PR:

1. **Unit Tests**: Component-level axe-core tests
2. **Pa11y CI**: Page-level accessibility scanning
3. **Lighthouse**: Accessibility score auditing

### Running Locally

```bash
# Run all accessibility tests
pnpm test:a11y

# Run Pa11y CI locally
pnpm pa11y:local

# Generate accessibility report
pnpm a11y:report
```

## Manual Testing

### Screen Reader Testing

#### NVDA (Windows)

1. Download NVDA from [nvaccess.org](https://www.nvaccess.org/)
2. Key commands:
   - `Insert + Down Arrow`: Read all
   - `Tab`: Move to next focusable element
   - `H`: Move to next heading
   - `D`: Move to next landmark
   - `Insert + F7`: List all links

#### VoiceOver (macOS)

1. Enable: `Cmd + F5`
2. Key commands:
   - `Ctrl + Option + A`: Read all
   - `Ctrl + Option + Right/Left`: Navigate
   - `Ctrl + Option + U`: Open rotor

#### TalkBack (Android)

1. Enable in Settings > Accessibility
2. Gestures:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate

### Keyboard Testing Checklist

- [ ] Can navigate all interactive elements with Tab
- [ ] Focus indicator is visible on all elements
- [ ] Escape key closes dialogs/modals
- [ ] Arrow keys work in menus and tabs
- [ ] Enter/Space activate buttons and links
- [ ] No keyboard traps exist

### Color Contrast Testing

1. Use browser DevTools color picker
2. Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
3. Test with high contrast mode enabled

### Testing Checklist

| Test | Tool/Method | Pass Criteria |
|------|------------|---------------|
| Axe-core scan | Automated | 0 violations |
| Lighthouse audit | Automated | Score ≥ 90 |
| NVDA testing | Manual | All content readable |
| VoiceOver testing | Manual | All content readable |
| Keyboard navigation | Manual | All interactive elements reachable |
| Focus management | Manual | Focus is logical and visible |
| Color contrast | Automated + Manual | 4.5:1 text, 3:1 UI |
| Reduced motion | Manual | Animations disabled |
| High contrast | Manual | Content visible |

## Reporting

### Generating Reports

```typescript
import { generateA11yReport, formatReportAsHtml } from '@aivo/a11y/testing';

const results = await runAxeTest(document);
const report = generateA11yReport(results);

// Output formats
const html = formatReportAsHtml(report);
const markdown = formatReportAsMarkdown(report);
const json = formatReportAsJson(report);
```

### Report Contents

Reports include:

- WCAG compliance level (A, AA, AAA)
- Violation count by severity
- Affected elements with selectors
- Remediation guidance
- Help URLs for each issue

## Common Issues and Fixes

### Missing Form Labels

```tsx
// ❌ Bad
<input type="email" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ✅ Good (with @aivo/a11y)
<AccessibleInput label="Email" type="email" />
```

### Missing Alt Text

```tsx
// ❌ Bad
<img src="logo.png" />

// ✅ Good (informative image)
<img src="logo.png" alt="AIVO Learning Platform" />

// ✅ Good (decorative image)
<img src="decoration.png" alt="" role="presentation" />
```

### Poor Color Contrast

```tsx
// ❌ Bad (2.5:1 ratio)
<p style={{ color: '#999', background: '#fff' }}>Text</p>

// ✅ Good (4.5:1 ratio)
<p style={{ color: '#595959', background: '#fff' }}>Text</p>
```

### Missing Focus Indicators

```css
/* ❌ Bad */
button:focus {
  outline: none;
}

/* ✅ Good */
button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

### Inaccessible Custom Components

```tsx
// ❌ Bad - no keyboard support
<div onClick={handleClick}>Click me</div>

// ✅ Good - proper button semantics
<button onClick={handleClick}>Click me</button>

// ✅ Good - if div must be used
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</div>
```

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [WebAIM](https://webaim.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
