/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mapped 1:1 from src/theme.ts `colors` so old visual system stays identical.
        black: '#FBF7F2',
        plum: '#2B1A1E',
        plumLight: '#F4DDE1',
        surface: '#FFFDFC',
        surface2: '#FFF8F4',
        purple: '#5B2384',
        purpleDeep: '#35104F',
        purpleLight: '#8B58B0',
        pink: '#B30C3D',
        pinkSoft: '#D45B7A',
        gold: '#B98A2F',
        espresso: '#2B1A1E',
        ivory: '#2B1A1E',
        muted: '#76686C',
        line: '#E9D9D0',
        danger: '#B42343',
        canvas: '#FBF7F2',
        text: '#2B1A1E',
        textInverse: '#FFFDFC',
        blush: '#F9EDEF',
        blushSoft: '#F4DDE1',
        selectedSurface: '#F7E4E8',
        selectedBorder: '#C97D8D',
        wine: '#B30C3D',
        wineDeep: '#6E1028',
      },
      borderRadius: {
        // Mapped from src/theme.ts `radius`
        sm: '12px',
        md: '18px',
        lg: '28px',
        pill: '999px',
      },
      fontFamily: {
        // Mapped from expo-google-fonts used across the app
        'poppins-regular': ['Poppins_400Regular'],
        'poppins-semibold': ['Poppins_600SemiBold'],
        'poppins-bold': ['Poppins_700Bold'],
        satisfy: ['Satisfy_400Regular'],
      },
    },
  },
  plugins: [],
};
