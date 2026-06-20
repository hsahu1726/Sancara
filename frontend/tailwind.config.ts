import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        impact: {
          low: '#059669',
          medium: '#D97706',
          high: '#EA580C',
          critical: '#DC2626',
        },
        surface: {
          DEFAULT: '#F0F4FA',
          card: '#FFFFFF',
          sidebar: '#F5F8FF',
          hover: '#E8EFFA',
          subtle: '#F8FAFF',
          border: '#D9E4F0',
          'border-light': '#E4EDF8',
        },
        ink: {
          DEFAULT: '#1C1917',
          secondary: '#78716C',
          muted: '#A8A29E',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(28,25,23,0.05), 0 1px 2px rgba(28,25,23,0.06)',
        'card-hover': '0 4px 14px rgba(28,25,23,0.08), 0 1px 4px rgba(28,25,23,0.04)',
        'card-lg': '0 8px 30px rgba(28,25,23,0.06), 0 2px 8px rgba(28,25,23,0.03)',
        sidebar: '1px 0 0 rgba(28,25,23,0.04)',
      },
      borderRadius: {
        card: '14px',
        button: '10px',
        input: '10px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
