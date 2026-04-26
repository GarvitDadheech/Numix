import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D0F',
        surface: '#161618',
        surface2: '#1E1E21',
        border: '#2A2A2E',
        primary: '#6C63FF',
        primaryHover: '#5A52E8',
        gold: '#F5B800',
        success: '#22C55E',
        error: '#EF4444',
        textPrimary: '#F4F4F5',
        textMuted: '#A1A1AA',
        textFaint: '#52525B',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        starFloat: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-200px) scale(0)', opacity: '0' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        starFloat: 'starFloat 2s ease-out forwards',
        pulse2: 'pulse2 1.5s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
