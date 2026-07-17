import { createClient } from '@/lib/supabase/ssr'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()

  if (!user.user) {
    redirect('/login')
  }

  const { data: intercoms } = await supabase
    .from('intercoms')
    .select('id')
    .limit(1)

  if (!intercoms || intercoms.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Virtual Concierge</h1>
          <p className="mt-2 text-muted-foreground">
            You don't have access to any intercoms. Contact the administrator.
          </p>
        </div>
      </div>
    )
  }

  redirect(`/admin/${intercoms[0].id}/configuration`)
}
