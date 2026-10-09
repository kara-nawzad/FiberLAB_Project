/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        noc: {
          950: '#05070d',
          900: '#0a0e18',
          850: '#0e1421',
          800: '#131a2b',
          700: '#1c2540',
          600: '#27324f',
          500: '#3b4867',
          400: '#5d6c8f',
          300: '#8c9ab8',
          200: '#c2cbdd',
        },
        optical: {
          green: '#22d383',
          amber: '#f5b544',
          red: '#f0544f',
          purple: '#a78bfa',
          idle: '#4b5568',
          cyan: '#38bdf8',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(56,189,248,0.35), 0 0 22px -4px rgba(56,189,248,0.55)',
        panel: '0 18px 40px -18px rgba(0,0,0,0.85)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.9' },
          '70%': { transform: 'scale(2.1)', opacity: '0' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        'sweep': {
          '0%': { opacity: '0.25' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.25' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.24,0,0.38,1) infinite',
        sweep: 'sweep 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
