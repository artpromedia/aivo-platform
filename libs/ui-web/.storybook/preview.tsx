import type { Preview, Decorator } from '@storybook/react';
import React from 'react';

import { GradeThemeProvider } from '../src/providers/GradeThemeProvider';
import type { GradeLevel, SensoryProfile } from '../src/themes/grade-themes';
import '../src/styles/globals.css';

// Theme decorator that wraps all stories with GradeThemeProvider
const withThemeProvider: Decorator = (Story, context) => {
  const gradeLevel = context.globals.theme as GradeLevel;
  const sensoryProfile: SensoryProfile = {
    highContrast: context.globals.highContrast === 'true',
    dyslexia: context.globals.dyslexia === 'true',
    reducedMotion: context.globals.reducedMotion === 'true',
    colorBlindness: null,
    largeText: context.globals.largeText === 'true',
    increasedSpacing: false,
  };

  return (
    <GradeThemeProvider
      gradeLevel={gradeLevel}
      sensoryProfile={sensoryProfile}
      persistPreference={false}
      respectSystemPreferences={false}
    >
      <div className="min-h-screen bg-background text-text p-6">
        <Story />
      </div>
    </GradeThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withThemeProvider],
  globalTypes: {
    theme: {
      description: 'Grade-based theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'K5', title: 'Explorer (K-5)' },
          { value: 'MS', title: 'Navigator (6-8)' },
          { value: 'HS', title: 'Scholar (9-12)' },
          { value: 'HSDark', title: 'Scholar Dark' },
        ],
        dynamicTitle: true,
      },
    },
    highContrast: {
      description: 'High contrast mode',
      toolbar: {
        title: 'Contrast',
        icon: 'contrast',
        items: [
          { value: 'false', title: 'Normal' },
          { value: 'true', title: 'High Contrast' },
        ],
      },
    },
    dyslexia: {
      description: 'Dyslexia-friendly font',
      toolbar: {
        title: 'Dyslexia',
        icon: 'accessibility',
        items: [
          { value: 'false', title: 'Standard Font' },
          { value: 'true', title: 'Dyslexia Font' },
        ],
      },
    },
    reducedMotion: {
      description: 'Reduced motion',
      toolbar: {
        title: 'Motion',
        icon: 'timer',
        items: [
          { value: 'false', title: 'Animations On' },
          { value: 'true', title: 'Reduced Motion' },
        ],
      },
    },
    largeText: {
      description: 'Large text mode',
      toolbar: {
        title: 'Text Size',
        icon: 'grow',
        items: [
          { value: 'false', title: 'Normal' },
          { value: 'true', title: 'Large Text' },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'MS',
    highContrast: 'false',
    dyslexia: 'false',
    reducedMotion: 'false',
    largeText: 'false',
  },
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // We use theme-based backgrounds
    },
    layout: 'padded',
  },
};

export default preview;
