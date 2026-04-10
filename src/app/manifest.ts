import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'iaNow',
    short_name: 'iaNow',
    description: 'Plataforma Inteligente de Gestão de Estratégias',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/favicon.webp',
        sizes: '32x32',
        type: 'image/webp',
      },
      {
        src: '/logo.webp',
        sizes: '192x192',
        type: 'image/webp',
      },
      {
        src: '/logo.webp',
        sizes: '512x512',
        type: 'image/webp',
      },
    ],
  }
}
