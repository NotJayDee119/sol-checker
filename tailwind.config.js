/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // The app is light-only. 'class' (instead of the default 'media') stops NativeWind's web
  // runtime from throwing "Cannot manually set color scheme" on page load.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('secondary'), foreground: token('secondary-foreground') },
        info: { DEFAULT: token('info'), foreground: token('info-foreground') },
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        success: { DEFAULT: token('success'), foreground: token('success-foreground') },
        warning: { DEFAULT: token('warning'), foreground: token('warning-foreground') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        card: { DEFAULT: token('card'), foreground: token('card-foreground') },
      },
      // Loaded in src/app/_layout.tsx. Custom fonts carry their own weight, so don't pair them with font-bold.
      fontFamily: {
        heading: ['BricolageGrotesque_700Bold'],
        mono: ['IBMPlexMono_500Medium'],
        'mono-bold': ['IBMPlexMono_600SemiBold'],
        hand: ['Caveat_700Bold'],
      },
      borderRadius: {
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
