import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: 'oklch(0.20 0.045 235)',
        sea: 'oklch(0.38 0.08 220)',
        pearl: 'oklch(0.97 0.008 210)',
        sand: 'oklch(0.955 0.015 85)',
      },
      fontFamily: {
        display: ['Amiri', 'serif'],
        sans: ['Cairo', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      backgroundColor: {
        page: 'var(--pearl)',
        card: 'var(--sand)',
        brand: 'var(--sea)',
      },
      textColor: {
        base: 'var(--ink)',
        brand: 'var(--sea)',
      },
    },
  },
  plugins: [],
}

export default config
