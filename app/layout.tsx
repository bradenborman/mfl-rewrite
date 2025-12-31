import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'MFL UI Rewrite',
  description: 'A modern interface for MyFantasyLeague.com',
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