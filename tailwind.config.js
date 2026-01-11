/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        zte: {
          blue: '#008ED3', 
          light: '#F0F9FF', 
          dark: '#0071A9',
          accent: '#0EA5E9'
        }
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 142, 211, 0.08), 0 2px 8px -1px rgba(0, 0, 0, 0.04)',
        'soft': '0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)'
      },
      animation: {
        'loading': 'loading 1.5s infinite ease-in-out',
      },
      keyframes: {
        loading: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' }
        }
      }
    }
  },
  plugins: [],
}