import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', '../../libs/ui-web/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Developer portal brand colors
        portal: {
          primary: '#6366f1',    // Indigo
          secondary: '#8b5cf6',  // Violet
          accent: '#06b6d4',     // Cyan
          success: '#10b981',    // Emerald
          warning: '#f59e0b',    // Amber
          error: '#ef4444',      // Red
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            code: {
              backgroundColor: '#f3f4f6',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
