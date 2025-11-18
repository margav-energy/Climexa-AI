/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'climexa': {
          'primary': '#22553A',
          'secondary': '#AED581',
          'accent': '#059669',
          'background': '#FAFAFA',
          'text': '#37474F',
        }
      }
    },
  },
  plugins: [],
}

