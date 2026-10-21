import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        roast: {
          950: '#140e0a',
          900: '#1c1410',
          800: '#2a1d14',
          700: '#3d2914',
          600: '#5c3d1e',
        },
        gold: {
          400: '#e2c48a',
          500: '#c4a574',
          600: '#a6854d',
        },
        cream: '#f6efe4',
        leaf: '#3f6b4a',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
