import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WINDMAR - Maritime Route Optimizer',
  description: 'Fuel-optimal route planning for MR Product Tankers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
