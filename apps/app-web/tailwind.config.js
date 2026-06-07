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
        // Paleta metálica morado-plata eMeet
        primary: {
          DEFAULT: '#7C3AED',   // violeta principal
          light: '#C4B5FD',     // lavanda / plata-morada
          dark: '#5B21B6',
        },
        silver: '#D4C8F0',      // plata con tinte morado
        surface: '#07040F',     // fondo base casi negro-púrpura
        card: '#100A1F',        // superficies de tarjeta
        muted: '#A5B4FC',       // texto secundario (azul-lavanda)
      },
      fontFamily: {
        // Usa la variable CSS inyectada por next/font/google en layout.tsx
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backgroundImage: {
        // Gradiente metálico principal — simula luz incidiendo sobre metal
        'metal': 'linear-gradient(160deg, #12082C 0%, #07040F 45%, #0E0520 100%)',
        // Superficies elevadas con brillo metálico
        'metal-card': 'linear-gradient(145deg, #1E1240 0%, #110926 55%, #0C0618 100%)',
        // Borde superior luminoso (luz sobre borde de metal)
        'metal-sheen': 'linear-gradient(90deg, transparent 0%, rgba(196,181,253,0.4) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}
