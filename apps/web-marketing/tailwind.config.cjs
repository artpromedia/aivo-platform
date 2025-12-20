const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    // Include shared UI library if used
    '../../libs/ui-web/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      // ==========================================
      // AIVO UNIFIED BRAND COLORS
      // Aligned with Flutter apps (aivo_theme.dart & parent_theme.dart)
      // ==========================================
      colors: {
        // ----------------------------------------
        // PRIMARY BRAND COLOR (AIVO Blue)
        // Source: Flutter aivo_theme.dart - K5/G6-8 primary
        // ----------------------------------------
        'aivo-primary': {
          DEFAULT: '#2D6BFF',
          50: '#EBF1FF',
          100: '#D6E4FF',
          200: '#ADC8FF',
          300: '#85ADFF',
          400: '#5C91FF',
          500: '#2D6BFF', // Main brand blue
          600: '#2458DB',
          700: '#1B45B7',
          800: '#133293',
          900: '#0A1F6F',
          950: '#051247',
        },

        // ----------------------------------------
        // SECONDARY COLOR (AIVO Orange - for learner/CTA)
        // Source: Flutter aivo_theme.dart - secondary
        // ----------------------------------------
        'aivo-orange': {
          DEFAULT: '#FF9C32',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF9C32', // Main brand orange
          600: '#EA7C0C',
          700: '#C2600C',
          800: '#9A4A0D',
          900: '#7C3A0E',
          950: '#431E06',
        },

        // ----------------------------------------
        // ACCENT COLOR (AIVO Purple - for parent app alignment)
        // Source: Flutter parent_theme.dart - secondary
        // ----------------------------------------
        'aivo-purple': {
          DEFAULT: '#7C3AED',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7C3AED', // Parent app purple
          800: '#6B21A8',
          900: '#581C87',
          950: '#3B0764',
        },

        // ----------------------------------------
        // SEMANTIC COLORS (Aligned with Flutter)
        // ----------------------------------------

        // Success - mint green (aligned with Flutter)
        'aivo-success': {
          DEFAULT: '#16A34A',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A', // Flutter success
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },

        // Warning - amber (aligned with Flutter)
        'aivo-warning': {
          DEFAULT: '#D97706',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706', // Flutter warning
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        // Error - red (aligned with Flutter)
        'aivo-error': {
          DEFAULT: '#DC2626',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626', // Flutter parent error
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },

        // ----------------------------------------
        // TEAL ACCENT (From Flutter G6-8 secondary)
        // ----------------------------------------
        'aivo-teal': {
          DEFAULT: '#3FB4A5',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#3FB4A5', // Flutter G6-8 secondary
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },

        // ----------------------------------------
        // NEUTRAL GRAYS (Aligned with Flutter backgrounds)
        // ----------------------------------------
        'aivo-gray': {
          50: '#F8FAFC', // Flutter parent background
          100: '#F1F5F9', // Flutter surfaceMuted
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569', // Flutter textSecondary
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A', // Flutter textPrimary
          950: '#020617',
        },

        // ----------------------------------------
        // SURFACE COLORS (From Flutter)
        // ----------------------------------------
        'aivo-surface': {
          DEFAULT: '#FFFFFF',
          muted: '#F1F5F9', // Flutter surfaceMuted
          variant: '#EEF5FF', // Flutter surfaceVariant
        },

        'aivo-background': {
          DEFAULT: '#F8FAFC', // Flutter parent background
          alt: '#F6F8FC', // Flutter G6-8 background
        },

        // ----------------------------------------
        // LEGACY ALIASES (for backward compatibility)
        // Map old names to new unified colors
        // ----------------------------------------
        'theme-primary': {
          DEFAULT: '#2D6BFF',
          50: '#EBF1FF',
          100: '#D6E4FF',
          200: '#ADC8FF',
          300: '#85ADFF',
          400: '#5C91FF',
          500: '#2D6BFF',
          600: '#2458DB',
          700: '#1B45B7',
          800: '#133293',
          900: '#0A1F6F',
          950: '#051247',
        },

        // Coral -> Now maps to aivo-orange (CTA color)
        coral: {
          DEFAULT: '#FF9C32',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF9C32',
          600: '#EA7C0C',
          700: '#C2600C',
          800: '#9A4A0D',
          900: '#7C3A0E',
        },

        // Salmon -> Secondary CTA accent
        salmon: {
          DEFAULT: '#FF8C42',
          50: '#FFF5EE',
          100: '#FFE8D6',
          200: '#FFD4B3',
          300: '#FFBD8A',
          400: '#FFA461',
          500: '#FF8C42',
          600: '#E67A35',
          700: '#CC6828',
          800: '#B3561B',
          900: '#99440E',
        },

        // Mint -> Now maps to aivo-success
        mint: {
          DEFAULT: '#16A34A',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },

        // Sunshine -> Now maps to aivo-warning
        sunshine: {
          DEFAULT: '#D97706',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        // Sky -> Keep for informational elements
        sky: {
          DEFAULT: '#0EA5E9',
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },

        // Semantic Colors (legacy)
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        info: '#3B82F6',
      },

      // ==========================================
      // TYPOGRAPHY (Aligned with Flutter - Inter)
      // ==========================================
      fontFamily: {
        sans: ['Inter', 'var(--font-inter)', ...fontFamily.sans],
        display: ['Space Grotesk', 'var(--font-space-grotesk)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
        // Add Lexend for dyslexia-friendly option (matches Flutter)
        dyslexia: ['Lexend', 'var(--font-lexend)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Match Flutter typography scale (G6-8 as default)
        display: ['34px', { lineHeight: '1.2', fontWeight: '700' }],
        headline: ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        title: ['22px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['17px', { lineHeight: '1.6', fontWeight: '400' }],
        label: ['14px', { lineHeight: '1.5', fontWeight: '600' }],
        // Legacy sizes
        'display-2xl': [
          '4.5rem',
          { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'display-xl': [
          '3.75rem',
          { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'display-lg': [
          '3rem',
          { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'display-md': [
          '2.25rem',
          { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        'display-sm': [
          '1.875rem',
          { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        'display-xs': ['1.5rem', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
      },

      // ==========================================
      // SPACING & SIZING
      // ==========================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },

      // ==========================================
      // BORDER RADIUS (Aligned with Flutter - 12px standard)
      // ==========================================
      borderRadius: {
        aivo: '12px', // Flutter standard
        'aivo-lg': '16px',
        'aivo-xl': '20px',
        'aivo-2xl': '24px',
        'aivo-3xl': '32px',
        // Legacy sizes
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3rem',
      },

      // ==========================================
      // SHADOWS (Aligned with Flutter elevation)
      // ==========================================
      boxShadow: {
        // AIVO shadows (aligned with Flutter)
        'aivo-sm': '0 1px 3px rgba(0, 0, 0, 0.08)',
        aivo: '0 2px 8px rgba(0, 0, 0, 0.08)',
        'aivo-md': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'aivo-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'aivo-xl': '0 16px 48px rgba(0, 0, 0, 0.16)',

        // Colored shadows for CTAs
        'aivo-primary': '0 8px 24px rgba(45, 107, 255, 0.25)',
        'aivo-orange': '0 8px 24px rgba(255, 156, 50, 0.3)',
        'aivo-purple': '0 8px 24px rgba(124, 58, 237, 0.25)',

        // Legacy shadows (kept for compatibility)
        soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg':
          '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.05)',
        'soft-xl': '0 20px 50px -12px rgba(0, 0, 0, 0.15)',
        'soft-2xl': '0 25px 60px -15px rgba(0, 0, 0, 0.2)',

        // Colored Shadows (updated to AIVO colors)
        coral: '0 10px 40px -10px rgba(255, 156, 50, 0.4)',
        'coral-lg': '0 20px 50px -12px rgba(255, 156, 50, 0.5)',
        salmon: '0 10px 40px -10px rgba(255, 140, 66, 0.4)',
        purple: '0 10px 40px -10px rgba(45, 107, 255, 0.4)',
        'purple-lg': '0 20px 50px -12px rgba(45, 107, 255, 0.5)',
        mint: '0 10px 40px -10px rgba(22, 163, 74, 0.4)',
        sky: '0 10px 40px -10px rgba(14, 165, 233, 0.4)',

        // Glass/Card Shadows
        glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover':
          '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },

      // ==========================================
      // ANIMATIONS
      // ==========================================
      keyframes: {
        // Entrance Animations
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },

        // Continuous Animations
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5%)' },
        },

        // Background Animations
        'gradient': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 0%' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'blob': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(20px, -30px) scale(1.1)' },
          '50%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '75%': { transform: 'translate(30px, 10px) scale(1.05)' },
        },

        // Interactive Animations
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'ping-soft': {
          '75%, 100%': { transform: 'scale(1.5)', opacity: '0' },
        },

        // Accordion/Dropdown
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        // Entrance
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-down': 'fade-down 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.5s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',

        // Continuous
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float-slow 4s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 20s linear infinite',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',

        // Background
        'gradient': 'gradient 6s ease infinite',
        'gradient-x': 'gradient-x 4s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'blob': 'blob 10s ease-in-out infinite',

        // Interactive
        'wiggle': 'wiggle 0.3s ease-in-out',
        'ping-soft': 'ping-soft 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',

        // Accordion
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },

      // ==========================================
      // BACKGROUNDS & GRADIENTS
      // ==========================================
      backgroundImage: {
        // Brand Gradients
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',

        // AIVO Gradients (aligned with Flutter)
        'gradient-aivo-primary': 'linear-gradient(135deg, #2D6BFF 0%, #1B45B7 100%)',
        'gradient-aivo-cta': 'linear-gradient(135deg, #FF9C32 0%, #2D6BFF 100%)',
        'gradient-aivo-purple': 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
        'gradient-aivo-teal': 'linear-gradient(135deg, #3FB4A5 0%, #0D9488 100%)',
        'gradient-aivo-hero': 'linear-gradient(180deg, #EBF1FF 0%, #FFFFFF 100%)',
        'gradient-aivo-section': 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',

        // Legacy Hero Gradients (updated to AIVO colors)
        'hero-gradient':
          'linear-gradient(135deg, rgba(45, 107, 255, 0.05) 0%, rgba(255, 255, 255, 1) 50%, rgba(255, 156, 50, 0.15) 100%)',
        'hero-mesh':
          'radial-gradient(at 40% 20%, rgba(45, 107, 255, 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 156, 50, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(22, 163, 74, 0.1) 0px, transparent 50%)',

        // Button Gradients (legacy - updated)
        'gradient-primary': 'linear-gradient(135deg, #2D6BFF 0%, #1B45B7 100%)',
        'gradient-coral': 'linear-gradient(135deg, #FF9C32 0%, #EA7C0C 100%)',
        'gradient-cta': 'linear-gradient(135deg, #FF9C32 0%, #EA7C0C 50%, #2D6BFF 100%)',

        // Card Gradients
        'gradient-card':
          'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
        'gradient-glass':
          'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',

        // Section Backgrounds (updated)
        'gradient-section': 'linear-gradient(180deg, #FFFFFF 0%, #EBF1FF 50%, #FFFFFF 100%)',
        'gradient-footer': 'linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)',
      },

      // ==========================================
      // TRANSITIONS
      // ==========================================
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    // Custom Plugin for Utilities
    function ({ addUtilities }) {
      // Text Gradient Utilities (AIVO aligned)
      addUtilities({
        '.text-gradient-aivo': {
          background: 'linear-gradient(135deg, #2D6BFF 0%, #3FB4A5 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-cta': {
          background: 'linear-gradient(135deg, #FF9C32 0%, #2D6BFF 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-purple': {
          background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        // Legacy gradients (remapped)
        '.text-gradient-primary': {
          background: 'linear-gradient(135deg, #2D6BFF 0%, #1B45B7 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-coral': {
          background: 'linear-gradient(135deg, #FF9C32 0%, #EA7C0C 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-rainbow': {
          background: 'linear-gradient(90deg, #FF9C32, #FBBF24, #16A34A, #0EA5E9, #2D6BFF)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
      });

      // Glass Effect Utilities
      addUtilities({
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.7)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.3)',
        },
        '.glass-dark': {
          'background': 'rgba(0, 0, 0, 0.5)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
      });

      // Animation Delay Utilities
      addUtilities({
        '.animation-delay-100': { 'animation-delay': '100ms' },
        '.animation-delay-200': { 'animation-delay': '200ms' },
        '.animation-delay-300': { 'animation-delay': '300ms' },
        '.animation-delay-400': { 'animation-delay': '400ms' },
        '.animation-delay-500': { 'animation-delay': '500ms' },
        '.animation-delay-700': { 'animation-delay': '700ms' },
        '.animation-delay-1000': { 'animation-delay': '1000ms' },
      });

      // Hide Scrollbar Utility
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    },
  ],
};
