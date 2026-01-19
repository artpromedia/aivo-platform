import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f8fafc' },
        { name: 'dark', value: '#1e293b' },
        { name: 'aivo-purple', value: '#f3e8ff' },
        { name: 'aivo-teal', value: '#e0f7fa' },
      ],
    },
    layout: 'centered',
  },
  globalTypes: {
    theme: {
      description: 'AIVO grade theme',
      defaultValue: 'K5',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'K5', title: 'K-5 (Explorer)' },
          { value: 'MS', title: 'Middle School (Navigator)' },
          { value: 'HS', title: 'High School (Innovator)' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
