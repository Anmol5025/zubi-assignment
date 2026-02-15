/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin': 'spin 2s linear infinite',
        'pulse-scale': 'pulse-scale 1.5s ease-in-out infinite',
        'highlight-pulse': 'highlight-pulse 1.5s ease-in-out infinite',
        'emoji-appear': 'emoji-appear 0.3s ease-out',
        'emoji-float': 'emoji-float 2s ease-in-out infinite',
        'sparkle': 'sparkle 1s ease-in-out infinite',
        'confetti-fall': 'confetti-fall 3s linear forwards',
        'pulse-ring': 'pulse-ring 1s ease-out infinite',
        'bounce-effect': 'bounce-effect 0.5s ease-in-out 3',
        'shake-effect': 'shake-effect 0.5s ease-in-out 2',
        'glow': 'glow 2s ease-in-out infinite',
        'overlay-appear': 'overlay-appear 0.3s ease-out',
      },
      keyframes: {
        'pulse-scale': {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(0, 0, 0, 0.2)',
          },
          '50%': { 
            transform: 'scale(1.05)',
            boxShadow: '0 0 0 10px rgba(0, 0, 0, 0)',
          },
        },
        'highlight-pulse': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.45' },
        },
        'emoji-appear': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'emoji-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '0', transform: 'scale(0)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(0) rotate(0deg)' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)' },
        },
        'pulse-ring': {
          '0%': { transform: 'translate(-50%, -50%) scale(0.8)', opacity: '1' },
          '100%': { transform: 'translate(-50%, -50%) scale(1.2)', opacity: '0' },
        },
        'bounce-effect': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'shake-effect': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
        'glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'overlay-appear': {
          '0%': { opacity: '0', transform: 'translate(-50%, -50%) scale(0.8)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
