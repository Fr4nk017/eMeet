/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de marca eMeet
        primary: {
          DEFAULT: '#7C3AED', // violeta principal
          light: '#A78BFA',
          dark: '#5B21B6',
        },
        accent: '#F59E0B',    // dorado / destacado
        surface: '#1A1A2E',   // fondo oscuro principal
        card: '#16213E',      // fondo de tarjetas
        muted: '#94A3B8',     // texto secundario
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
