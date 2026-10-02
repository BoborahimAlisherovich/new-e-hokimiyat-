import coreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'coverage/**',
      'backend/**',
      // O'chirishga tayyorlangan eski kod — tsconfig'dan ham chiqarilgan
      '_to_delete/**',
      // Muharrir/agent sozlamalari, ilova kodi emas
      '.claude/**',
      'Claude outputs/**',
    ],
  },
  ...coreWebVitals,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
]

export default config
