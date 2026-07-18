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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Tables } from '@/types'

type AccessLog = Tables<'access_logs'> & {
  intercom_code: { code: string; description: string | null } | null
}

type IntercomCode = { id: string; code: string; description: string | null }

const STATUS_OPTIONS = ['all', 'success', 'invalid_code', 'invalid_schedule', 'concierge_redirect', 'error']

function formatInTimezone(dateStr: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(dateStr))
}

export function LogsTable({ intercomId, timezone, codes }: { intercomId: string; timezone: string; codes: IntercomCode[] }) {
  const supabase = createBrowserSupabaseClient()
  const [page, setPage] = useState(0)
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [codeSearch, setCodeSearch] = useState('')
  const [codeFilter, setCodeFilter] = useState('all')
  const pageSize = 50

  useEffect(() => { loadLogs() }, [page, statusFilter, codeSearch, codeFilter])

  async function loadLogs() {
    setLoading(true)
    let query = supabase
      .from('access_logs')
      .select('*, intercom_code:intercom_code_id (code, description)', { count: 'exact' })
      .eq('intercom_id', intercomId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (codeFilter !== 'all') {
      query = query.eq('intercom_code_id', codeFilter)
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
        <Select value={codeFilter} onValueChange={(v) => { setCodeFilter(v ?? 'all'); setPage(0) }}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Filter by code" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All codes</SelectItem>
            {codes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.description || '(no description)'}
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Access Code</TableHead>
              <TableHead>Code Entered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {l.created_at ? formatInTimezone(l.created_at, timezone) : '-'}
                </TableCell>
                <TableCell>
                  {l.intercom_code ? (
                    <span className="text-xs">
                      <span className="font-mono">{l.intercom_code.code}</span>
                      {l.intercom_code.description && (
                        <span className="ml-1 text-muted-foreground">— {l.intercom_code.description}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="font-mono">{l.code_entered}</TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {l.status.replace(/_/g, ' ')}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {l.status === 'success' ? 'Access granted' :
                   l.status === 'invalid_code' ? 'Invalid code entered' :
                   l.status === 'invalid_schedule' ? 'Code valid but outside schedule' :
                   l.status === 'concierge_redirect' ? 'Redirected to concierge' :
                   l.status === 'error' ? 'System error' : l.status.replace(/_/g, ' ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
