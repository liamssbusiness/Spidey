import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#070710',
          surface: '#0d0d1a',
          surface2: '#121225',
          surface3: '#181830',
        },
        spidey: {
          red: '#cc0000',
          'red-dark': '#880000',
          'red-dim': '#440000',
          blue: '#0044cc',
          'blue-dark': '#002888',
          'blue-dim': '#001444',
        },
        border: {
          DEFAULT: '#1e1e3a',
          subtle: '#151528',
        },
        text: {
          DEFAULT: '#f0f0f8',
          muted: '#8888aa',
          dim: '#444466',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'web-spin': 'spin 20s linear infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(204, 0, 0, 0)' },
          '50%': { boxShadow: '0 0 16px 2px rgba(204, 0, 0, 0.25)' },
        },
      },
      backgroundImage: {
        'web-pattern': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%231e1e3a' stroke-width='0.5'%3E%3Ccircle cx='40' cy='40' r='38'/%3E%3Ccircle cx='40' cy='40' r='28'/%3E%3Ccircle cx='40' cy='40' r='18'/%3E%3Ccircle cx='40' cy='40' r='8'/%3E%3Cline x1='40' y1='2' x2='40' y2='78'/%3E%3Cline x1='2' y1='40' x2='78' y2='40'/%3E%3Cline x1='11' y1='11' x2='69' y2='69'/%3E%3Cline x1='69' y1='11' x2='11' y2='69'/%3E%3C/g%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
}

export default config
