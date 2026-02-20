/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        surface: '#1E1E1E',
        'surface-alt': '#2C2C2C',
        primary: '#BB86FC',
        secondary: '#03DAC6',
        error: '#CF6679',
        'on-surface': '#E1E1E1',
        'on-background': '#FFFFFF',
        muted: '#888888',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
