import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-provider'
import './globals.css'
import './mfl-theme.css'

export const metadata: Metadata = {
  title: 'MFL Express',
  description: 'A lightweight, sleek interface for MyFantasyLeague.com',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}