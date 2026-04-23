/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#07080a',
          1: '#0d0f12',
          2: '#111418',
          3: '#181c22',
          4: '#1f242d',
        },
        gold: {
          DEFAULT: '#f0a500',
          dim: 'rgba(240, 165, 0, 0.08)',
          glow: 'rgba(240, 165, 0, 0.18)',
        },
        accent: {
          success: '#4bb97a',
          danger: '#e05252',
          info: '#4a9eff',
          warning: '#f0a500',
        },
        text: {
          primary: '#e8e4dc',
          secondary: '#9a9690',
          muted: '#3f3d3a',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.07)',
          active: 'rgba(255, 255, 255, 0.14)',
        }
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        narrative: ['Instrument Serif', 'serif'],
      },
    },
  },
  plugins: [],
}
