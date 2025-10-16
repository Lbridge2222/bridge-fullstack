/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forest-green': 'hsl(150 60% 8%)',
        'forest-green-foreground': 'hsl(0 0% 100%)',
        'surface-primary': 'hsl(0 0% 100%)',
        'text-primary': 'hsl(0 0% 7%)',
        'text-secondary': 'hsl(215 20% 45%)',
        'text-foreground': 'hsl(0 0% 7%)',
        'background': 'hsl(0 0% 100%)',
        'border': 'hsl(215 25% 90%)',
        'accent': 'hsl(0 100% 50%)',
      },
    },
  },
  plugins: [],
}
