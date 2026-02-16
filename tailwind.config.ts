import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      fontFamily: {
        sans: ['var(--font-varela)', 'var(--font-nunito)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px hsl(220 20% 18%)',
        'hard-sm': '2px 2px 0px 0px hsl(220 20% 18%)',
        'hard-lg': '6px 6px 0px 0px hsl(220 20% 18%)',
        'hard-pink': '4px 4px 0px 0px hsl(340 65% 72%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'machine-shake': {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '10%': { transform: 'translateX(-4px) rotate(-1deg)' },
          '20%': { transform: 'translateX(4px) rotate(1deg)' },
          '30%': { transform: 'translateX(-4px) rotate(-1deg)' },
          '40%': { transform: 'translateX(4px) rotate(1deg)' },
          '50%': { transform: 'translateX(-2px) rotate(0deg)' },
          '60%': { transform: 'translateX(2px) rotate(0deg)' },
          '70%': { transform: 'translateX(-2px) rotate(-0.5deg)' },
          '80%': { transform: 'translateX(2px) rotate(0.5deg)' },
          '90%': { transform: 'translateX(-1px) rotate(0deg)' },
        },
        'capsule-drop': {
          '0%': { transform: 'translateY(-100%) scale(0.5)', opacity: '0' },
          '50%': { transform: 'translateY(10%) scale(1.1)', opacity: '1' },
          '70%': { transform: 'translateY(-5%) scale(0.95)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '4px 4px 0px 0px hsl(340 65% 72%)' },
          '50%': { boxShadow: '4px 4px 0px 0px hsl(340 65% 62%), 0 0 20px hsl(340 65% 72% / 0.3)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'machine-shake': 'machine-shake 0.8s ease-in-out',
        'capsule-drop': 'capsule-drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'confetti-fall': 'confetti-fall 3s linear forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
