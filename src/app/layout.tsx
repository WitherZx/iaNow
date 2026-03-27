import type { Metadata, Viewport } from 'next'
import { Montserrat } from 'next/font/google'
import { Providers } from '@/lib/providers'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'iaNow — The Power of Execution', template: '%s | iaNow' },
  description: 'Plataforma SaaS de inteligência artificial para acelerar sua empresa: estratégia, jurídico e financeiro em um só lugar.',
  keywords: ['SaaS', 'inteligência artificial', 'gestão empresarial', 'estratégia', 'PME'],
  icons: {
    icon: '/favicon.webp',
    shortcut: '/favicon.webp',
    apple: '/favicon.webp',
  },
  openGraph: {
    title: 'iaNow — The Power of Execution',
    description: 'Plataforma SaaS de IA para PMEs brasileiras.',
    images: ['/logo.webp'],
    locale: 'pt_BR',
    type: 'website',
  },
}
 
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={montserrat.variable}>
      <body className="font-montserrat m-0 p-0 bg-slate-200 text-[#171717] antialiased" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
