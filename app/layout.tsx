import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { Toaster as HotToaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Entry List Manager',
  description: 'A locally hosted app for managing entry lists with photos and annotations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>
        {children}
        <Toaster />
        <SonnerToaster />
        <HotToaster position="bottom-right" />
      </body>
    </html>
  )
}



import './globals.css'