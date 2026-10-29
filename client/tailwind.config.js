/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          400: '#ffb84d',
          500: '#ffa116',
          600: '#e8920c',
          700: '#c67a08',
        },
        easy: '#00b8a3',
        medium: '#ffc01e',
        hard: '#ff375f',
        slate: {
          50: '#f4f4f5',
          100: '#e4e4e7',
          200: '#d4d4d8',
          300: '#c4c4c8',
          400: '#a3a3a3',
          500: '#8c8c8c',
          600: '#6b6b6b',
          700: '#4a4a4a',
          800: '#3e3e3e',
          850: '#2c2c2c',
          900: '#262626',
          950: '#1a1a1a',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.9rem' }],
      },
    },
  },
  plugins: [],
};
