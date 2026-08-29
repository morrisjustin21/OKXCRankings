/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // carry over your Duncan Demons red if you want XC branded to match, or swap for a distinct XC accent
        primary: '#EF1D2C',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
