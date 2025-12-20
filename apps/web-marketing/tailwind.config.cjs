const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
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
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
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
      // AIVO BRAND COLORS
      // ==========================================
      colors: {
        // Primary Brand Colors (Violet/Lavender - Friendly, Accessible)
        'theme-primary': {
          DEFAULT: '#8B5CF6', // violet-500
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },

        // Secondary Colors (Coral/Salmon - Warm, Inviting)
        coral: {
          DEFAULT: '#FF6B6B',
          50: '#FFF5F5',
          100: '#FFE3E3',
          200: '#FFC9C9',
          300: '#FFA8A8',
          400: '#FF8787',
          500: '#FF6B6B',
          600: '#FA5252',
          700: '#F03E3E',
          800: '#E03131',
          900: '#C92A2A',
        },
        salmon: {
          DEFAULT: '#FA8072',
          50: '#FFF5F3',
          100: '#FFE8E4',
          200: '#FFD4CC',
          300: '#FFB8AA',
          400: '#FF9A88',
          500: '#FA8072',
          600: '#F56565',
          700: '#E53E3E',
          800: '#C53030',
          900: '#9B2C2C',
        },

        // Accent Colors
        mint: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        sunshine: {
          DEFAULT: '#FBBF24',
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

        // Semantic Colors
        success: '#10B981',
        warning: '#FBBF24',
        error: '#EF4444',
        info: '#3B82F6',

        // Neutral Colors
        'aivo-gray': {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },
      },

      // ==========================================
      // TYPOGRAPHY
      // ==========================================
      fontFamily: {
        sans: ['var(--font-inter)', ...fontFamily.sans],
        display: ['var(--font-space-grotesk)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      fontSize: {
        'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-sm': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
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
      // BORDER RADIUS (Friendly, Rounded Aesthetic)
      // ==========================================
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
        '5xl': '3rem',
      },

      // ==========================================
      // SHADOWS (Soft, Elevated Feel)
      // ==========================================
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.05)',
        'soft-xl': '0 20px 50px -12px rgba(0, 0, 0, 0.15)',
        'soft-2xl': '0 25px 60px -15px rgba(0, 0, 0, 0.2)',

        // Colored Shadows for Brand Elements
        'coral': '0 10px 40px -10px rgba(255, 107, 107, 0.4)',
        'coral-lg': '0 20px 50px -12px rgba(255, 107, 107, 0.5)',
        'salmon': '0 10px 40px -10px rgba(250, 128, 114, 0.4)',
        'purple': '0 10px 40px -10px rgba(139, 92, 246, 0.4)',
        'purple-lg': '0 20px 50px -12px rgba(139, 92, 246, 0.5)',
        'mint': '0 10px 40px -10px rgba(16, 185, 129, 0.4)',
        'sky': '0 10px 40px -10px rgba(14, 165, 233, 0.4)',

        // Glass/Card Shadows
        'glass': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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

        // Hero Gradients
        'hero-gradient': 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(255, 255, 255, 1) 50%, rgba(251, 207, 232, 0.3) 100%)',
        'hero-mesh': 'radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 107, 107, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(16, 185, 129, 0.1) 0px, transparent 50%)',

        // Button Gradients
        'gradient-primary': 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        'gradient-coral': 'linear-gradient(135deg, #FF6B6B 0%, #FA8072 50%, #8B5CF6 100%)',
        'gradient-cta': 'linear-gradient(135deg, #FF6B6B 0%, #FA5252 50%, #7C3AED 100%)',

        // Card Gradients
        'gradient-card': 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)',

        // Section Backgrounds
        'gradient-section': 'linear-gradient(180deg, #FFFFFF 0%, #F5F3FF 50%, #FFFFFF 100%)',
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
    // Custom Plugin for Utilities
    function({ addUtilities }) {
      // Text Gradient Utilities
      addUtilities({
        '.text-gradient-primary': {
          'background': 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-coral': {
          'background': 'linear-gradient(135deg, #FF6B6B 0%, #FA8072 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-rainbow': {
          'background': 'linear-gradient(90deg, #FF6B6B, #FBBF24, #10B981, #0EA5E9, #8B5CF6)',
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
