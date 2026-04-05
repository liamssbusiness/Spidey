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
          primary: '#0a0a0a',
          surface: '#111111',
          surface2: '#1a1a1a',
          surface3: '#222222',
        },
        gold: {
          DEFAULT: '#d4af37',
          dark: '#8a7520',
          dim: '#4a3f15',
          bright: '#f6d365',
        },
        border: {
          DEFAULT: '#2a2a2a',
          subtle: '#1a1a1a',
        },
        text: {
          DEFAULT: '#f0f0f0',
          muted: '#999999',
          dim: '#555555',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'scan-line': 'scan-line 8s linear infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0)' },
          '50%': { boxShadow: '0 0 16px 2px rgba(212, 175, 55, 0.25)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
