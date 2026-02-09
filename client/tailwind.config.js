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
          teal: '#14B8A6',
          purple: '#8B5CF6',
          indigo: '#6366F1',
          peach: '#FEE4D9',
          lavender: '#EDE4F7',
        },
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        secondary: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        success: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
      },
      backgroundImage: {
        'gradient-cta': 'linear-gradient(135deg, #14B8A6 0%, #8B5CF6 100%)',
        // Diagonal gradient: peachy bottom-left, white center, lavender top-right
        'gradient-page': 'linear-gradient(135deg, #FEE4D9 0%, #FEFEFE 35%, #FEFEFE 50%, #EDE4F7 85%, #E5D9F2 100%)',
      },
      backgroundSize: {
        '200': '200% 200%',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'gradient': 'gradient 3s ease infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}
