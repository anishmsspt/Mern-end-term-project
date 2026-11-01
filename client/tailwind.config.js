/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#121416',
          900: '#181b1d',
          850: '#1e2224',
          800: '#272c2e',
          700: '#353b3d',
          600: '#4e5557',
          500: '#6f7672',
          400: '#959b95',
          300: '#b4bab4',
        },
        pine: {
          900: '#16271f',
          800: '#1d3429',
          700: '#28473a',
          600: '#385d4c',
          500: '#4f7a63',
          400: '#739d84',
          300: '#9dbca6',
          200: '#c5dacb',
          100: '#e5f0e9',
        },
        cream: {
          50: '#faf5ec',
          100: '#f3ead9',
          200: '#e6d8bf',
          300: '#cbbb9f',
          400: '#a6977c',
        },
        peach: {
          100: '#fdede2',
          200: '#f7d3b8',
          300: '#f2b48c',
          400: '#e89e72',
        },
        ember: {
          400: '#e58f5c',
          500: '#d9773f',
          600: '#b8602f',
          700: '#964b22',
        },
        // Re-point brand to ember/peach scale so existing brand-* classes work seamlessly
        brand: {
          50: '#faf5ec',
          100: '#f3ead9',
          200: '#f7d3b8',
          300: '#f2b48c',
          400: '#e58f5c',
          500: '#d9773f',
          600: '#b8602f',
          700: '#964b22',
        },
        // Re-tuned difficulty colors from Redesign Direction
        easy: '#8fbf9c',
        medium: '#e2ae58',
        hard: '#d9695c',
        // Map slate to ink scales to smoothly upgrade legacy slate-* styling
        slate: {
          50: '#faf5ec',
          100: '#f3ead9',
          200: '#e6d8bf',
          300: '#cbbb9f',
          400: '#959b95',
          500: '#6f7672',
          600: '#4e5557',
          700: '#353b3d',
          800: '#272c2e',
          850: '#1e2224',
          900: '#181b1d',
          950: '#121416',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.9rem' }],
      },
      letterSpacing: {
        widest: '.2em',
        tracked: '.24em',
        cinematic: '.32em',
      },
      boxShadow: {
        'glow-peach': '0 0 30px 6px rgba(242, 180, 140, 0.25)',
        'glow-ember': '0 10px 30px -10px rgba(217, 119, 63, 0.5)',
        'card-lift': '0 24px 50px -24px rgba(0, 0, 0, 0.7)',
        'frame': '0 40px 80px -40px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'drift': 'drift 24s ease-in-out infinite alternate',
        'rise': 'rise 1.1s cubic-bezier(.2,.7,.2,1) forwards',
        'shimmer': 'sh 1.8s linear infinite',
      },
      keyframes: {
        drift: {
          '0%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1.12) translate3d(-1.2%, -1%, 0)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        sh: {
          to: { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
};
