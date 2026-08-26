/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Deep charcoal/navy ground for the luxury dark theme.
        navy: {
          950: '#05070d',
          900: '#0a0e1a',
          800: '#111726',
          700: '#1a2236',
          600: '#28324a',
          500: '#3c4a68',
        },
        // Subtle brass/gold accent used sparingly for CTAs and highlights.
        gold: {
          50: '#fbf5e6',
          100: '#f3e4bb',
          200: '#e8d08a',
          300: '#dcb95c',
          400: '#cfa441',
          500: '#c19a3a',
          600: '#a17f2e',
          700: '#7c6224',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // A refined system serif stack (no external font download required,
        // so headings render instantly and consistently offline).
        serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
