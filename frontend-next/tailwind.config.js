/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './contexts/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // SLMS Arabic Design System Colors
        primary: {
          50: '#f0f7ff',
          100: '#e0efff', 
          200: '#baddff',
          300: '#7cc2ff',
          400: '#36a3ff',
          500: '#1A6BB5', // Primary Light
          600: '#0F4C81', // Primary Navy (Main)
          700: '#0A3358', // Primary Dark
          800: '#072543',
          900: '#051a30',
          navy: '#0F4C81',
          light: '#1A6BB5', 
          dark: '#0A3358',
        },
        accent: {
          DEFAULT: '#F59E0B', // Accent Amber
          50: '#fffbeb',
          100: '#fef3c7', 
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        success: {
          DEFAULT: '#10B981', // Success Green
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0', 
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        danger: {
          DEFAULT: '#EF4444', // Danger Red
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5', 
          400: '#f87171',
          500: '#EF4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        info: {
          DEFAULT: '#3B82F6', // Info Blue
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3B82F6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Semantic Colors from Design System
        background: '#F0F4F8',
        surface: '#FFFFFF',
        'text-dark': '#1E293B',
        'text-muted': '#64748B',
        'border-color': '#E2E8F0',
        'sidebar-bg': '#0D1B2A',
        secondary: {
          DEFAULT: '#0D7377', // Design System Secondary Teal
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0D7377',
          600: '#0a5c5f',
          700: '#084547',
          800: '#052e2f',
          900: '#031717',
        },
        warning: {
          DEFAULT: '#B45309',
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#f59e0b',
          500: '#B45309',
          600: '#92400e',
          700: '#78350f',
          800: '#5c2c0a',
          900: '#451a03',
        },
      },
      fontFamily: {
        // SLMS Arabic Design System Fonts
        'arabic': ['IBM Plex Sans Arabic', 'Tajawal', 'system-ui', 'sans-serif'],
        'primary': ['IBM Plex Sans Arabic', 'Inter', 'system-ui', 'sans-serif'],
        'heading': ['Tajawal', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        'mono': ['Fira Code', 'Consolas', 'Courier New', 'monospace'],
        sans: ['IBM Plex Sans Arabic', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'sidebar': '260px',
        'sidebar-collapsed': '64px', 
        'header': '64px',
        'content': '24px',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '10px', 
        'lg': '16px',
        'xl': '20px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
        'md': '0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)',
        'modal': '0 8px 32px rgba(0,0,0,0.12)',
        'lg': '0 8px 32px rgba(0,0,0,0.12)',
      },
      transitionDuration: {
        '150': '0.15s',
        '200': '0.2s', 
        '250': '0.25s',
        '600': '0.6s',
      },
      transitionTimingFunction: {
        'ease': 'ease',
        'sidebar': 'cubic-bezier(0.4,0,0.2,1)',
      },
      keyframes: {
        'slide-in': {
          '0%': { 
            transform: 'translateX(100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1'
          },
        },
        'slide-in-rtl': {
          '0%': { 
            transform: 'translateX(-100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1'
          },
        },
        'hover-card': {
          '0%': { 
            transform: 'translateY(0px)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)'
          },
          '100%': { 
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)'
          },
        },
        'btn-hover': {
          '0%': { 
            transform: 'translateY(0px)'
          },
          '100%': { 
            transform: 'translateY(-1px)'
          },
        },
        'modal-open': {
          '0%': { 
            opacity: '0',
            transform: 'translateY(8px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'toast-in': {
          '0%': { 
            transform: 'translateX(-100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1'
          },
        },
        'progress-fill': {
          '0%': { 
            width: '0%'
          },
          '100%': { 
            width: 'var(--progress-value, 100%)'
          },
        },
        'fade-in': {
          '0%': { 
            opacity: '0'
          },
          '100%': { 
            opacity: '1'
          },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-in-rtl': 'slide-in-rtl 0.3s ease-out',
        'hover-card': 'hover-card 0.2s ease',
        'btn-hover': 'btn-hover 0.15s ease',
        'modal-open': 'modal-open 0.25s ease',
        'toast-in': 'toast-in 0.3s ease',
        'progress-fill': 'progress-fill 0.6s linear',
        'fade-in': 'fade-in 0.2s ease',
      },
    },
  },
  plugins: [
    // RTL Support Plugin
    function ({ addUtilities }) {
      const newUtilities = {
        '.flip-x': {
          transform: 'scaleX(-1)',
        },
        '.flip-y': {
          transform: 'scaleY(-1)',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
