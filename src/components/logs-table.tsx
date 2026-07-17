'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tables } from '@/types'

type AccessLog = Tables<'access_logs'>

const STATUS_OPTIONS = ['all', 'success', 'invalid_code', 'invalid_schedule', 'concierge_redirect', 'error']

export function LogsTable({ intercomId }: { intercomId: string }) {
  const supabase = createBrowserSupabaseClient()
  const [page, setPage] = useState(0)
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [codeSearch, setCodeSearch] = useState('')
  const pageSize = 50

  useEffect(() => { loadLogs() }, [page, statusFilter, codeSearch])

  async function loadLogs() {
    setLoading(true)
    let query = supabase
      .from('access_logs')
      .select('*', { count: 'exact' })
      .eq('intercom_id', intercomId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (codeSearch) {
      query = query.ilike('code_entered', `%${codeSearch}%`)
    }

    const { data, count: total } = await query
    setLogs(data ?? [])
    setCount(total ?? 0)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? 'all'); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search by code..."
          value={codeSearch}
          onChange={(e) => { setCodeSearch(e.target.value); setPage(0) }}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Timestamp</th>
              <th className="px-4 py-2 text-left font-medium">Phone</th>
              <th className="px-4 py-2 text-left font-medium">Code Entered</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="px-4 py-2 text-muted-foreground">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-2 font-mono text-muted-foreground">{l.code_entered}</td>
                <td className="px-4 py-2 font-mono">{l.code_entered}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    l.status === 'success' ? 'bg-green-100 text-green-700' :
                    l.status === 'concierge_redirect' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {l.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {l.status === 'success' ? 'Access granted' :
                   l.status === 'invalid_code' ? 'Invalid code entered' :
                   l.status === 'invalid_schedule' ? 'Code valid but outside schedule' :
                   l.status === 'concierge_redirect' ? 'Redirected to concierge' :
                   l.status === 'error' ? 'System error' : l.status.replace(/_/g, ' ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {count > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, count)} of {count}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= count} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
