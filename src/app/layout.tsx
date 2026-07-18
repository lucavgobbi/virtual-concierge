import './globals.css'
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
