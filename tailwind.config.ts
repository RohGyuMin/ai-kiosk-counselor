import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0b1733',
          800: '#122150',
          700: '#1b2f6e',
        },
        gold: {
          500: '#c8a86a',
          400: '#d8bd85',
        },
        cream: '#f6f1e7',
      },
    },
  },
  plugins: [],
};
export default config;
