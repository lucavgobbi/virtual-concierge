import { createClient } from '@/lib/supabase/ssr'
import { notFound } from 'next/navigation'
import { CodesTable } from '@/components/codes-table'

export const dynamic = 'force-dynamic'

export default async function CodesPage({
  params,
}: {
  params: { intercomId: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: ownership } = await supabase
    .from('user_intercoms')
    .select('intercom_id')
    .eq('intercom_id', params.intercomId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!ownership) notFound()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Access Codes</h1>
      <CodesTable intercomId={params.intercomId} />
    </div>
  )
}
