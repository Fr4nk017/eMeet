/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const supabaseImageHost = (() => {
  try {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    return rawUrl ? new URL(rawUrl).hostname : null
  } catch {
    return null
  }
})()

const nextConfig = {
  reactStrictMode: true,

  // Elimina el header X-Powered-By: Next.js (seguridad + reduce fingerprinting)
  poweredByHeader: false,

  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
      process.env.VITE_GOOGLE_MAPS_API_KEY ??
      '',
  },

  // Elimina console.log en producción — reduce bundle y evita filtrar datos
  compiler: {
    ...(isProd ? { removeConsole: { exclude: ['error', 'warn'] } } : {}),
  },

  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost', port: '3006' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      ...(supabaseImageHost ? [{ protocol: 'https', hostname: supabaseImageHost }] : []),
    ],
  },

  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
    ],
    // Tiempo que Next.js mantiene segmentos de ruta en el router cache del cliente
    staleTimes: {
      dynamic: 30,   // 30s — rutas dinámicas (feed, search)
      static: 300,   // 5min — rutas estáticas (auth, profile)
    },
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Evita clickjacking: solo puede embeberse en el mismo origen
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Evita MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controla cuánta información se envía en el Referer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Habilita DNS prefetch para mejorar latencia de recursos externos
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Permissions Policy: limita acceso a cámara/micrófono; geolocation solo self
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
}

export default nextConfig
