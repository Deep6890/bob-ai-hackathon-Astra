/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        aviation: {
          50: '#e8f0fe',
          100: '#c7d8fc',
          200: '#a3baf8',
          300: '#7894f2',
          400: '#5276e8',
          500: '#3355d9',
          600: '#2542b3',
          700: '#1d3491',
          800: '#1a2e77',
          900: '#192b65',
        },
      },
    },
  },
  plugins: [],
}