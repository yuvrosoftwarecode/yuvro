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
          DEFAULT: '#111827',
          50: '#fafafa',
          100: '#f3f4f6',
          300: '#d1d5db',
          600: '#111827',
          700: '#000000'
        },
        muted: {
          DEFAULT: '#f3f4f6',
          foreground: '#6b7280',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#111827'
        },
        border: {
          DEFAULT: '#e5e7eb',
        },
        saffron: {
          DEFAULT: '#f97316',
          start: '#fb923c',
          end: '#ea580c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    }
  },
  plugins: [
    '@tailwindcss/forms',
  ],
}