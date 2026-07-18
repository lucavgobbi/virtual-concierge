'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import {
  Settings,
  KeyRound,
  Calendar,
  ScrollText,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { href: 'configuration', label: 'Configuration', icon: Settings },
  { href: 'codes', label: 'Access Codes', icon: KeyRound },
  { href: 'schedule', label: 'Schedule', icon: Calendar },
  { href: 'logs', label: 'Logs', icon: ScrollText },
]

export function AdminSidebar({ intercomSelector }: { intercomSelector: React.ReactNode }) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const intercomId = params.intercomId as string
  const supabase = createBrowserSupabaseClient()

  const currentTab = pathname.split('/').pop()

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-background p-4">
      <div className="mb-4">{intercomSelector}</div>
      <Separator className="mb-4" />
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.href
          return (
            <Link
              key={item.href}
              href={`/admin/${intercomId}/${item.href}`}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <Separator className="mb-4" />
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground"
        onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </aside>
  )
}
