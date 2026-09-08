/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // TODO(yakuniy bosqich): ikkisini ham false ga o'tkazish.
  // Tip xatolari yashirilganda frontend/backend maydon nomlari mos
  // kelmasligi kabi buglar ishlab chiqarishga o'tib ketadi (masalan
  // TaskCreateInput'dagi organization_id: number, backend UUID kutadi).
  // Hozircha true — mavjud xatolar bosqichma-bosqich tuzatiladi.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

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
