import type { Config } from 'tailwindcss'

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
          DEFAULT: '#0E1A2B',
          50: '#1a2d47',
          100: '#162640',
          200: '#132238',
          300: '#0E1A2B',
          400: '#0a1220',
          500: '#060c15',
        },
        ulli: {
          yellow: '#FFC233',
          'yellow-light': '#FFD56B',
          'yellow-dark': '#E6A800',
        },
        magenta: {
          DEFAULT: '#E61C5D',
          light: '#FF4081',
          dark: '#C2185B',
        },
      },
    },
  },
  plugins: [],
}
export default config
