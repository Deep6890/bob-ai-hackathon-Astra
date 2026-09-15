/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#F7F7F5',
        warm: '#FAF9F6',
        card: '#FFFFFF',
        subtle: '#F4F4F3',
        borderLight: '#E7E7E5',
        borderSecondary: '#DEDEDC',
        textPrimary: '#181818',
        textSecondary: '#686868',
        textMuted: '#929292',
        darkCard: '#383838',
        darkCardText: '#FFFFFF',
        darkCardSecondary: '#CFCFCF',
        accent: '#86FF7B',
        warning: '#F2B84B',
        danger: '#F05D5E',
        neutral: '#A7A7A7',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}