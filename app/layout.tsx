import type { Metadata, Viewport } from 'next'
import { Varela_Round, Nunito } from 'next/font/google'

import './globals.css'

const _varelaRound = Varela_Round({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-varela',
})

const _nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  title: 'GachaVerse - Crypto Gachapon Machine',
  description: 'Spin the Gachapon, collect rare NFTs! A crypto vending machine with anime-inspired minimal UI.',
}

export const viewport: Viewport = {
  themeColor: '#d4e8f7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${_varelaRound.variable} ${_nunito.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
