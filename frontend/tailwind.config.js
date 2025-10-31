// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./.storybook/**/*.{js,ts,jsx,tsx}", // 🔥 ADD THIS - Include Storybook files
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        // Legacy Support
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))'
        },
        'forest-green': {
          DEFAULT: 'hsl(var(--forest-green))',
          foreground: 'hsl(var(--forest-green-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        
        // New Professional Color System
        brand: {
          primary: 'hsl(var(--brand-primary))',
          accent: 'hsl(var(--brand-accent))',
          secondary: 'hsl(var(--brand-secondary))'
        },
        semantic: {
          success: 'hsl(var(--semantic-success))',
          warning: 'hsl(var(--semantic-warning))',
          error: 'hsl(var(--semantic-error))',
          info: 'hsl(var(--semantic-info))'
        },
        interactive: {
          primary: 'hsl(var(--interactive-primary))',
          secondary: 'hsl(var(--interactive-secondary))',
          accent: 'hsl(var(--interactive-accent))',
          muted: 'hsl(var(--interactive-muted))'
        },
        surface: {
          primary: 'hsl(var(--surface-primary))',
          secondary: 'hsl(var(--surface-secondary))',
          tertiary: 'hsl(var(--surface-tertiary))',
          overlay: 'hsl(var(--surface-overlay))'
        },
        text: {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          tertiary: 'hsl(var(--text-tertiary))',
          inverse: 'hsl(var(--text-inverse))'
        },
        slate: {
          50: 'hsl(var(--slate-50))',
          100: 'hsl(var(--slate-100))',
          200: 'hsl(var(--slate-200))',
          300: 'hsl(var(--slate-300))',
          400: 'hsl(var(--slate-400))',
          500: 'hsl(var(--slate-500))',
          600: 'hsl(var(--slate-600))',
          700: 'hsl(var(--slate-700))',
          800: 'hsl(var(--slate-800))',
          900: 'hsl(var(--slate-900))',
          950: 'hsl(var(--slate-950))'
        },
        zinc: {
          800: 'hsl(var(--zinc-800))',
          900: 'hsl(var(--zinc-900))'
        },
        red: {
          50: 'hsl(var(--red-50))',
          100: 'hsl(var(--red-100))',
          200: 'hsl(var(--red-200))',
          300: 'hsl(var(--red-300))',
          400: 'hsl(var(--red-400))',
          500: 'hsl(var(--red-500))',
          600: 'hsl(var(--red-600))',
          700: 'hsl(var(--red-700))',
          800: 'hsl(var(--red-800))',
          900: 'hsl(var(--red-900))'
        },
        green: {
          50: 'hsl(var(--green-50))',
          100: 'hsl(var(--green-100))',
          200: 'hsl(var(--green-200))',
          300: 'hsl(var(--green-300))',
          400: 'hsl(var(--green-400))',
          500: 'hsl(var(--green-500))',
          600: 'hsl(var(--green-600))',
          700: 'hsl(var(--green-700))',
          800: 'hsl(var(--green-800))',
          900: 'hsl(var(--green-900))'
        },
        button: {
          'primary-bg': 'hsl(var(--button-primary-bg))',
          'primary-text': 'hsl(var(--button-primary-text))',
          'primary-hover': 'hsl(var(--button-primary-hover))',
          'primary-active': 'hsl(var(--button-primary-active))',
          'accent-bg': 'hsl(var(--button-accent-bg))',
          'accent-text': 'hsl(var(--button-accent-text))',
          'accent-hover': 'hsl(var(--button-accent-hover))',
          'forest-bg': 'hsl(var(--button-forest-bg))',
          'forest-text': 'hsl(var(--button-forest-text))',
          'forest-hover': 'hsl(var(--button-forest-hover))'
        },
        status: {
          'success-bg': 'hsl(var(--status-success-bg))',
          'success-text': 'hsl(var(--status-success-text))',
          'success-border': 'hsl(var(--status-success-border))',
          'warning-bg': 'hsl(var(--status-warning-bg))',
          'warning-text': 'hsl(var(--status-warning-text))',
          'warning-border': 'hsl(var(--status-warning-border))',
          'error-bg': 'hsl(var(--status-error-bg))',
          'error-text': 'hsl(var(--status-error-text))',
          'error-border': 'hsl(var(--status-error-border))',
          'info-bg': 'hsl(var(--status-info-bg))',
          'info-text': 'hsl(var(--status-info-text))',
          'info-border': 'hsl(var(--status-info-border))'
        }
      },
      fontFamily: {
        sans: ['Satoshi', 'sans-serif'],
      }
    }
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")]
}
