export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Dark Theme (Zinc-based)
        dark: {
          bg: 'var(--bg-primary)',
          card: 'var(--bg-secondary)',
          elevated: 'var(--bg-elevated)',
          canvas: 'var(--bg-canvas)',
          overlay: 'var(--bg-overlay)',
        },
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
        },
        border: {
          default: 'var(--border-default)',
          muted: 'var(--border-subtle)',
          emphasis: 'var(--border-emphasis)',
          active: 'var(--border-active)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverted: 'var(--text-inverted)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          danger: 'var(--status-danger)',
          info: 'var(--status-info)',
        },
        // Legacy support (mapped to new palette)
        accent: {
          blue: 'var(--brand-primary)',
          purple: 'var(--brand-secondary)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'xxs': ['11px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['13px', { lineHeight: '20px' }],
        'base': ['14px', { lineHeight: '24px' }],
        'lg': ['16px', { lineHeight: '24px' }],
        'xl': ['18px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px rgba(0, 0, 0, 0.2)',
        'md': '0 2px 4px rgba(0, 0, 0, 0.25)',
        'lg': '0 4px 8px rgba(0, 0, 0, 0.3)',
        'xl': '0 8px 16px rgba(0, 0, 0, 0.35)',
        '2xl': '0 12px 24px rgba(0, 0, 0, 0.4)',
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '150ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 100ms ease-out',
        'slide-up': 'slideUp 150ms ease-out',
        'scale-in': 'scaleIn 100ms ease-out',
        'pulse-recording': 'pulseRecording 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseRecording: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(248, 81, 73, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 0 8px rgba(248, 81, 73, 0)' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
