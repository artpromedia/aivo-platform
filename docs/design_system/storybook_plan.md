# Storybook Plan (Web)

We can start lightweight and treat `/design-system` as the living gallery. If full Storybook is needed, use this starter:

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../apps/web-district/**/*.(stories|story).@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: { autodocs: true },
};
export default config;
```

```tsx
// apps/web-district/components/aivo-button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { GradeThemeProvider, AccessibilityProvider, Button } from '@aivo/ui-web';

const meta: Meta<typeof Button> = {
  title: 'Aivo/Button',
  component: Button,
  decorators: [
    (Story) => (
      <GradeThemeProvider>
        <AccessibilityProvider>
          <div style={{ padding: 16 }}>
            <Story />
          </div>
        </AccessibilityProvider>
      </GradeThemeProvider>
    ),
  ],
};
export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: { children: 'Primary', variant: 'primary' },
};
```

Add scripts to root `package.json` if/when dependencies are installed:

- `"storybook": "storybook dev -p 6006"`
- `"storybook:build": "storybook build"`

Until Storybook is wired, use `/design-system` as the canonical gallery and manual visual QA surface.
