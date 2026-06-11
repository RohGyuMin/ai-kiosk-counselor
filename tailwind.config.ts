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
        // 테마 토큰 — .kiosk-root의 CSS 변수에 연동 (라이트/다크 전환)
        ink: 'rgb(var(--k-ink) / <alpha-value>)',
        deep: 'rgb(var(--k-deep) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
export default config;
