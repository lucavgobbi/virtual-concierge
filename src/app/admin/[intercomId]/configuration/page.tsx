import { createClient } from '@/lib/supabase/ssr'
import { notFound } from 'next/navigation'
import { ConfigurationForm } from '@/components/configuration-form'

export const dynamic = 'force-dynamic'

export default async function ConfigurationPage({
  params,
}: {
  params: { intercomId: string }
}) {
  const supabase = createClient()
  const { data: intercom } = await supabase
    .from('intercoms')
    .select('*')
    .eq('id', params.intercomId)
    .single()

  if (!intercom) notFound()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Configuration</h1>
      <ConfigurationForm config={intercom} />
    </div>
  )
}
