/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        foreground: {
          50: '#fafafa',
          100: '#f3f4f6',
          300: '#d1d5db',
          600: '#111827',
          700: '#000000'
        }
      }
    }
  },
  plugins: [
    '@tailwindcss/forms',
  ],
}