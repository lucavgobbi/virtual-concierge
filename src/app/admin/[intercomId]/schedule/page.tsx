import { createClient } from '@/lib/supabase/ssr'
import { ScheduleView } from './schedule-view'

export const dynamic = 'force-dynamic'

export default async function SchedulePage({
  params,
}: {
  params: { intercomId: string }
}) {
  const supabase = createClient()

  const [schedulesResult, codesResult] = await Promise.all([
    supabase
      .from('schedules')
      .select('*, intercom_code:intercom_code_id (code, description)')
      .in('intercom_code_id', (
        await supabase
          .from('intercom_codes')
          .select('id')
          .eq('intercom_id', params.intercomId)
      ).data?.map(c => c.id) ?? []
      ),
    supabase
      .from('intercom_codes')
      .select('id, code, description')
      .eq('intercom_id', params.intercomId),
  ])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Schedule</h1>
      <ScheduleView
        intercomId={params.intercomId}
        initialSchedules={schedulesResult.data ?? []}
        codes={codesResult.data ?? []}
      />
    </div>
  )
}
