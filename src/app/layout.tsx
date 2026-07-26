import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { PwaRegister } from '@/components/layout/PwaRegister'

export const metadata: Metadata = {
  title: {
    default: 'CoToom — Khám phá & Di chuyển tại Cô Tô',
    template: '%s | CoToom',
  },
  description:
    'Nền tảng đặt xe và khám phá địa điểm du lịch tại đảo Cô Tô. Homestay, nhà hàng, điểm tham quan và dịch vụ xe ôm tất cả trong một ứng dụng.',
  keywords: ['Cô Tô', 'đặt xe', 'du lịch', 'homestay', 'nhà hàng', 'CoToom'],
  authors: [{ name: 'CoToom' }],
  openGraph: {
    title: 'CoToom — Khám phá & Di chuyển tại Cô Tô',
    description: 'Nền tảng đặt xe và khám phá địa điểm du lịch tại đảo Cô Tô.',
    type: 'website',
    locale: 'vi_VN',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#369af5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </body>
    </html>
  )
}
