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
          900: '#0d2137',
          800: '#0f3460',
          700: '#1a5276',
        },
        gold: {
          500: '#0e9f8c',
          400: '#1abfaa',
        },
        cream: '#e8f5f3',
      },
    },
  },
  plugins: [],
};
export default config;
