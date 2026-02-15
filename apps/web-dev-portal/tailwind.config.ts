import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', '../../libs/ui-web/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Developer portal brand colors — Nova palette
        portal: {
          primary: '#8b5cf6',    // Vibrant purple
          secondary: '#6366f1',  // Indigo
          accent: '#60a5fa',     // Sky blue
          success: '#34d399',    // Emerald
          warning: '#fbbf24',    // Amber
          error: '#f87171',      // Red
        },
        background: 'rgb(var(--foreground-rgb) / <alpha-value>)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'rgb(241, 240, 255)',
            code: {
              backgroundColor: 'rgba(55, 48, 107, 0.5)',
              color: '#c4b5fd',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            a: { color: '#8b5cf6' },
            strong: { color: 'rgb(241, 240, 255)' },
            h1: { color: 'rgb(241, 240, 255)' },
            h2: { color: 'rgb(241, 240, 255)' },
            h3: { color: 'rgb(241, 240, 255)' },
            h4: { color: 'rgb(241, 240, 255)' },
            blockquote: { color: 'rgb(163, 160, 200)', borderLeftColor: '#37306B' },
            hr: { borderColor: '#37306B' },
            'thead th': { color: 'rgb(241, 240, 255)' },
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
