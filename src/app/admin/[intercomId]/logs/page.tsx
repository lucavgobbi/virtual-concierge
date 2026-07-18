import { createClient } from '@/lib/supabase/ssr'
import { notFound } from 'next/navigation'
import { LogsTable } from '@/components/logs-table'

export const dynamic = 'force-dynamic'

export default async function LogsPage({
  params,
}: {
  params: { intercomId: string }
}) {
  const supabase = createClient()

  const { data: ownership } = await supabase
    .from('user_intercoms')
    .select('intercom_id')
    .eq('intercom_id', params.intercomId)
    .maybeSingle()
  if (!ownership) notFound()

  const [intercomResult, codesResult] = await Promise.all([
    supabase.from('intercoms').select('timezone').eq('id', params.intercomId).single(),
    supabase.from('intercom_codes').select('id, code, description').eq('intercom_id', params.intercomId).order('description'),
  ])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Access Logs</h1>
      <LogsTable
        intercomId={params.intercomId}
        timezone={intercomResult.data?.timezone ?? 'UTC'}
        codes={codesResult.data ?? []}
      />
    </div>
  )
}
