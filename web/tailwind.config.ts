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
        'ink-2': 'oklch(0.28 0.055 230)',
        abyss: 'oklch(0.14 0.04 240)',
        tide: 'oklch(0.46 0.09 215)',
        sea: 'oklch(0.38 0.08 220)',
        'sea-glow': 'oklch(0.62 0.10 200)',
        foam: 'oklch(0.99 0.004 200)',
        pearl: 'oklch(0.97 0.008 210)',
        sand: 'oklch(0.955 0.015 85)',
        'sand-2': 'oklch(0.93 0.022 80)',
        'sand-3': 'oklch(0.87 0.028 75)',
        clay: 'oklch(0.58 0.12 40)',
        'clay-soft': 'oklch(0.86 0.05 55)',
        brass: 'oklch(0.72 0.09 75)',
        rule: 'oklch(0.84 0.015 215)',
        'rule-strong': 'oklch(0.68 0.025 215)',
        muted: 'oklch(0.46 0.02 230)',
        'muted-2': 'oklch(0.60 0.015 230)',
      },
      fontFamily: {
        display: ['Amiri', 'Instrument Serif', 'serif'],
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
        'serif-en': ['Instrument Serif', 'Amiri', 'serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
}

export default config
