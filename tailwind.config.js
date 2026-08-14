/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B1220',
          navylight: '#0F1B2E',
          navyactive: '#1A2740',
          accent: '#D4A574',
          accentlight: '#E0B378',
          primary: '#1E2A4A',
          primarydark: '#12203D',
          line: '#3B4A7A',
          fill: '#E8EAF6',
        },
        semantic: {
          success: {
            text: '#16A34A',
            bg: '#DCFCE7'
          },
          warning: {
            text: '#D97706',
            bg: '#FEF3C7'
          },
          danger: {
            text: '#DC2626',
            bg: '#FEE2E2'
          },
          info: {
            text: '#2563EB',
            bg: '#DBEAFE'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
