/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#4A90E2',
          purple: '#9B59B6',
          pink: '#E91E63',
          orange: '#FF9800',
          green: '#4CAF50',
        },
        bg: {
          light: '#F5F7FA',
          white: '#FFFFFF',
          card: '#FFFFFF',
        },
        text: {
          primary: '#2C3E50',
          secondary: '#7F8C8D',
          light: '#BDC3C7',
        },
        status: {
          success: '#27AE60',
          error: '#E74C3C',
          warning: '#F39C12',
          info: '#3498DB',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Comic Sans MS', 'sans-serif'],
      },
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '6': '1.5rem',
        '8': '2rem',
        '12': '3rem',
        '16': '4rem',
      },
    },
  },
  plugins: [],
}
