/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"TikTok Sans"', '"TikTokSans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        canvas: '#FAFAFA',
        surface: '#FFFFFF',
        'surface-dark': '#212121',
        'surface-darker': '#1F1F1F',
        'surface-card': '#292929',
        'text-primary': '#0A0A0A',
        'text-secondary': '#525252',
        'text-muted': '#8F8F8F',
        'text-inverse': '#FFFFFF',
        border: 'rgba(0, 0, 0, 0.10)',
        'border-strong': 'rgba(0, 0, 0, 0.20)',
        'border-light': 'rgba(255, 255, 255, 0.13)',
        accent: '#141414',
        dark: '#141414',
      },
      fontSize: {
        '2xs': '10px',
        'section': ['clamp(20px, 4vw, 24px)', { lineHeight: 'normal', letterSpacing: '-0.48px' }],
        'body': ['12px', { lineHeight: '18px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'price': ['24px', { lineHeight: '28px' }],
        '3xl': ['32px', { lineHeight: '44px', letterSpacing: '-0.64px' }],
      },
      borderRadius: {
        'pill': '999px',
      },
      boxShadow: {
        'button': 'inset 0px 0.5px 0.5px rgba(255,255,255,0.6), inset 0px -0.5px 0.5px rgba(0,0,0,0.5)',
        'button-dark': 'inset 0px -0.5px 0.5px rgba(0,0,0,0.1), inset 0px -0.707px 0.707px rgba(0,0,0,0.1)',
        'card': '0px 1px 1px rgba(0,0,0,0.10), 0px 4px 4px rgba(0,0,0,0.08), 0px 6px 6px rgba(0,0,0,0.06), 0px 8px 8px rgba(0,0,0,0.04)',
        'pricing': '0px 1.415px 1.415px rgba(0,0,0,0.10), 0px 11.319px 11.319px rgba(0,0,0,0.04)',
        'terminal': '0px 9px 20px -6px rgba(0,0,0,0.50)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};
