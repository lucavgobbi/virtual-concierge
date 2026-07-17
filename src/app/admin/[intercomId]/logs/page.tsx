import { LogsTable } from '@/components/logs-table'

export const dynamic = 'force-dynamic'

export default function LogsPage({
  params,
}: {
  params: { intercomId: string }
}) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Access Logs</h1>
      <LogsTable intercomId={params.intercomId} />
    </div>
  )
}
