/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Tip tekshiruvi YOQILGAN: `npx tsc --noEmit` toza o'tadi, shuning
  // uchun uni yashirishning hojati yo'q. Yashirilganda frontend/backend
  // maydon nomlari mos kelmasligi ishlab chiqarishga o'tib ketardi.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Eslatma: Next 16 da `eslint` kaliti qo'llab-quvvatlanmaydi —
  // lint alohida `npm run lint` bilan ishga tushiriladi.

  // Faqat kerakli ikonka/komponentlar bundle'ga tushadi.
  // lucide-react 82 joyda import qilinadi — bu eng katta yutuq.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      'date-fns',
      '@radix-ui/react-icons',
    ],
  },

  compiler: {
    // Ishlab chiqarishda console.log qoldirilmaydi (xotira va shovqin)
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Katta sahifalar uchun statik yuklanish vaqtini kamaytiradi
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,

  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'api.ehokimiyat.uz' },
      { protocol: 'https', hostname: 'api.pytech.uz' },
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      // Rahbariyat rasmlari — Hukumat portalining o'z serveri (landing)
      { protocol: 'https', hostname: 'api-portal.gov.uz' },
    ],
  },

  async headers() {
    return [
      {
        // Statik xarita/geodata fayllari — uzoq muddatli kesh
        source: '/geo/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
}

export default nextConfig
