/**
 * tailwind.config.js — config for the STATIC Tailwind build.
 *
 * This repo used to load the Tailwind CDN JIT compiler at runtime (~300 KB
 * of JS recompiling styles in every visitor's browser). The committed
 * css/tailwind.css is now generated once via scripts/build_tailwind.sh.
 *
 * The theme below is the exact config that previously lived inline in
 * index.html — keep them in sync conceptually; this file is now the only
 * copy. Re-run scripts/build_tailwind.sh after ANY change to Tailwind
 * classes in index.html or js/**.
 */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['Fira Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        background:   'var(--bg)',
        card:         'var(--card)',
        card2:        'var(--card2)',
        border:       'var(--border)',
        foreground:   'var(--fg)',
        muted:        'var(--muted)',
        'muted-fg':   'var(--muted-fg)',
        primary:      'var(--primary)',
        'primary-fg': 'var(--primary-fg)',
      },
      animation: {
        'fade-up':    'fadeUp 0.3s ease-out',
        'spin-tick':  'spinTick 0.08s steps(1) infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scale-in':   'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeUp:    { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        spinTick:  { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(37,99,235,0.25)' }, '50%': { boxShadow: '0 0 0 8px rgba(37,99,235,0)' } },
        scaleIn:   { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
};
