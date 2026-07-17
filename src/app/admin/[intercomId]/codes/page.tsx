import { CodesTable } from '@/components/codes-table'

export const dynamic = 'force-dynamic'

export default function CodesPage({
  params,
}: {
  params: { intercomId: string }
}) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Access Codes</h1>
      <CodesTable intercomId={params.intercomId} />
    </div>
  )
}
