import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        ap: {
          text: '#4E4D4D',
          'black-gray': '#404040',
          'dark-gray': '#4B4B4B',
          'medium-darker-gray': '#585858',
          'medium-gray': '#B8B8B8',
          'header-gray': '#DCDCDC',
          'light-gray': '#F6F6F6',
          'row-highlight': '#9E9E9E',
          white: '#FFFFFF',
          yellow: '#FBB040',
          'medium-yellow': '#FAD47F',
          'medium-light-yellow': '#FFE6AF',
          'matte-orange': '#FFC268',
          'cyan-medium': '#36B9C1',
          'green-landlord': '#1F7700',
          'light-green': '#9EDA89',
          'red-deep': '#FD0000',
          'red-light': '#FFB0B0',
          'red-very-light': '#FFD1D1',
          'blue-tenant': '#031CFF',
          'blue-deep': '#3D6CC2',
          'precision-light': '#76A7FF',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
