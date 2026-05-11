/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#1B4FD8',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        sidebar: {
          bg:     '#0F172A',
          hover:  '#1E293B',
          active: '#1B4FD8',
          text:   '#94A3B8',
          textActive: '#FFFFFF',
        },
        estado: {
          aceptado:    '#10B981',
          rechazado:   '#EF4444',
          contingencia: '#F59E0B',
          generado:    '#6B7280',
          firmado:     '#3B82F6',
          transmitido: '#8B5CF6',
          anulado:     '#374151',
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
}
