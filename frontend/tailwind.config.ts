import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Syroco-inspired maritime color palette
        primary: {
          50: '#e6f0ff',
          100: '#b3d7ff',
          200: '#80beff',
          300: '#4da5ff',
          400: '#1a8cff',
          500: '#0073e6',
          600: '#005ab3',
          700: '#004180',
          800: '#00284d',
          900: '#000f1a',
        },
        ocean: {
          50: '#e6f4f7',
          100: '#b3e0e8',
          200: '#80ccd9',
          300: '#4db8ca',
          400: '#1aa4bb',
          500: '#008ba2',
          600: '#006d7e',
          700: '#004f5a',
          800: '#003136',
          900: '#001312',
        },
        maritime: {
          dark: '#0a1628',
          darker: '#050b14',
          light: '#1a2942',
          lighter: '#2a3f5f',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-maritime': 'linear-gradient(135deg, #0a1628 0%, #1a2942 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #004f5a 0%, #008ba2 100%)',
      },
      boxShadow: {
        'maritime': '0 4px 20px rgba(0, 115, 230, 0.15)',
        'ocean': '0 4px 20px rgba(0, 139, 162, 0.15)',
      },
    },
  },
  plugins: [],
}

export default config
