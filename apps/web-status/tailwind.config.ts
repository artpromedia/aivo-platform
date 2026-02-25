import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        aivo: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#baddfd',
          300: '#7dc3fc',
          400: '#38a3f8',
          500: '#0e87e9',
          600: '#026bc7',
          700: '#0355a1',
          800: '#074985',
          900: '#0c3d6e',
          950: '#082749',
        },
        status: {
          operational: '#10b981',
          degraded: '#f59e0b',
          partial_outage: '#f97316',
          major_outage: '#ef4444',
          maintenance: '#6366f1',
        },
      },
    },
  },
  plugins: [],
};

export default config;
