/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF7',
          100: '#F7F4EB',
          200: '#EFE9D8',
        },
        plum: {
          800: '#3A2E39',
          900: '#261D25',
        },
        gold: {
          400: '#D4AF37',
          500: '#C5A059',
          600: '#AA8C2C',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}