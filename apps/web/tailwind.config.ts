import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': '#0a0a0b',
        'bg-secondary': '#111113',
        'bg-tertiary': '#18181b',
        'bg-elevated': '#1f1f23',

        // Borders
        'border-subtle': '#27272a',
        'border-default': '#3f3f46',
        'border-strong': '#52525b',

        // Text
        'text-primary': '#fafafa',
        'text-secondary': '#a1a1aa',
        'text-tertiary': '#71717a',

        // Accent
        'accent-primary': '#6366f1',
        'accent-hover': '#818cf8',
        'accent-subtle': 'rgba(99, 102, 241, 0.125)',

        // Status
        'status-success': '#22c55e',
        'status-warning': '#eab308',
        'status-error': '#ef4444',
        'status-info': '#3b82f6',

        // Priority
        'priority-critical': '#ef4444',
        'priority-high': '#f97316',
        'priority-medium': '#eab308',
        'priority-low': '#71717a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.8125rem',
        'base': '0.875rem',
        'lg': '1rem',
        'xl': '1.125rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
