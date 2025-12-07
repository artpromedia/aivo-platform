# UI Web

Shared React UI components built on the Aivo design tokens.

## What’s included
- Grade-aware theming via `GradeThemeProvider` and Tailwind plugin (`createGradeThemePlugin`).
- Primitives: `Button`, `Badge`, `Card`, `Heading`, `GradeThemeToggle`.

## Tailwind setup
```ts
// tailwind.config.ts
import { createGradeThemePlugin } from '@aivo/ui-web';

export default {
	content: [/* app + component globs */],
	plugins: [createGradeThemePlugin('G6_8')],
};
```

## Runtime usage
```tsx
import { GradeThemeProvider, Button, GradeThemeToggle } from '@aivo/ui-web';

<html data-grade-theme="G6_8">{/* SSR default */}
	<body>
		<GradeThemeProvider initialGrade="G6_8">
			<GradeThemeToggle />
			<Button>Do the thing</Button>
		</GradeThemeProvider>
	</body>
</html>
```
