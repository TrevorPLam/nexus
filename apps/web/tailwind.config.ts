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
        primary: {
          DEFAULT: '#007AFF',
          50: '#e5f3ff',
          100: '#cce7ff',
          200: '#99ccff',
          300: '#66b0ff',
          400: '#3394ff',
          500: '#007AFF',
          600: '#0062cc',
          700: '#004999',
          800: '#003366',
          900: '#001a33',
        },
      },
    },
  },
  plugins: [],
};

export default config;
