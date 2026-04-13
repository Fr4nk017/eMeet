/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict Mode activa doble-render en dev para detectar bugs.
  // Desactivarlo acelera notablemente el desarrollo; reactivar antes de producción.
  reactStrictMode: false,

  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
      process.env.VITE_GOOGLE_MAPS_API_KEY ??
      '',
  },

  experimental: {
    // Le dice al compilador qué paquetes optimizar con tree-shaking agresivo.
    // Evita importar el barrel completo de react-icons y framer-motion.
    optimizePackageImports: [
      'framer-motion',
      'react-icons/hi',
      'react-icons/hi2',
      'react-icons/fi',
    ],
  },
}

export default nextConfig
