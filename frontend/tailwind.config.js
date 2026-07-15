/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        white: 'var(--text-white)',
        background: 'var(--background)',
        card: 'var(--card)',
        cardHover: 'var(--card-hover)',
        border: 'var(--border)',
        muted: 'var(--muted)',
        accent: {
          DEFAULT: '#6366f1', // Indigo 500
          hover: '#4f46e5', // Indigo 600
          light: '#818cf8',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        neutral: {
          50: 'var(--neutral-50)',
          100: 'var(--neutral-100)',
          200: 'var(--neutral-200)',
          300: 'var(--neutral-300)',
          400: 'var(--neutral-400)',
          500: 'var(--neutral-500)',
          600: 'var(--neutral-600)',
          700: 'var(--neutral-700)',
          800: 'var(--neutral-800)',
          900: 'var(--neutral-900)',
          950: 'var(--neutral-950)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      keyframes: {
        ripple: {
          '0%':   { width: '8px', height: '8px', opacity: '0.8' },
          '100%': { width: '160px', height: '160px', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 30px 6px rgba(99, 102, 241, 0.35)', transform: 'scale(1)' },
          '50%':      { boxShadow: '0 0 60px 20px rgba(99, 102, 241, 0.6)',  transform: 'scale(1.04)' },
        },
        floatUp: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'ripple':      'ripple 0.9s ease-out forwards',
        'pulse-glow':  'pulseGlow 2.8s ease-in-out infinite',
        'float':       'floatUp 4s ease-in-out infinite',
        'fade-in-up':  'fadeInUp 0.5s ease-out both',
        'slide-left':  'slideInLeft 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
