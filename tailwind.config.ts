import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Accent — Cobre do Atacama (UMA cor apenas)
        accent: {
          DEFAULT: '#C27B4F',
          hover: '#A8653B',
          subtle: 'rgba(194,123,79,0.12)',
        },
        // Surfaces — Light mode
        surface: {
          page: '#FAF7F2',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
          hover: '#F5EFE7',
          sidebar: '#2C2420',
          'sidebar-icon': '#1A1614',
        },
        // Text
        text: {
          primary: '#2C2420',
          secondary: '#6B5D52',
          muted: '#8C7B6B',
        },
        // Status (APENAS feedback funcional)
        status: {
          success: '#5B9A6B',
          error: '#C45C5C',
          warning: '#D4A03C',
        },
        // Borders
        border: {
          DEFAULT: '#E8E0D6',
          subtle: '#F0EAE2',
          timeline: '#D6CCC0',
        },

        // === Dark mode overrides (usados com .dark prefix) ===
        dark: {
          page: '#1A1614',
          card: '#2C2420',
          elevated: '#3D3330',
          hover: '#3D3330',
          sidebar: '#131110',
          'sidebar-icon': '#0D0B0A',
          'text-primary': '#F5EFE7',
          'text-secondary': '#A89888',
          'text-muted': '#7A6B5E',
          'border-default': '#3D3330',
          'border-subtle': '#2C2420',
          'border-timeline': '#4A3F3A',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'hero': ['2rem', { lineHeight: '1.1', fontWeight: '500' }],
        'display': ['1.5rem', { lineHeight: '1.2', fontWeight: '500' }],
        'heading': ['1.25rem', { lineHeight: '1.3', fontWeight: '700' }],
        'subheading': ['1.0625rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['0.8125rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.03em' }],
        'small': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        'card': '20px',
        'button': '12px',
        'pill': '9999px',
        'input': '10px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(44,36,32,0.04)',
        'hover': '0 8px 24px rgba(44,36,32,0.08)',
        'float': '0 12px 40px rgba(44,36,32,0.12)',
      },
      spacing: {
        'sidebar-icon': '60px',
        'sidebar-expanded': '240px',
        'sidebar-full': '300px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '350ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'pulse-star': 'pulseStar 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        pulseStar: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
