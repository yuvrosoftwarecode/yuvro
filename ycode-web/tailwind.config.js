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
          DEFAULT: 'hsl(30, 100%, 50%)',
          start:   'hsl(30, 100%, 50%)',
          end:     'hsl(38, 92%, 50%)',
          50:  'hsl(30, 100%, 97%)',
          100: 'hsl(30, 100%, 94%)',
          200: 'hsl(30, 100%, 87%)',
          300: 'hsl(30, 100%, 76%)',
          400: 'hsl(30, 100%, 64%)',
          500: 'hsl(30, 100%, 55%)',
          600: 'hsl(30, 100%, 50%)',
          700: 'hsl(30, 100%, 42%)',
          800: 'hsl(30, 100%, 34%)',
          900: 'hsl(30, 100%, 26%)',
          950: 'hsl(30, 100%, 15%)',
        },
        sidebar: 'hsl(0, 0%, 98%)'
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