'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CodeFormDialog } from './code-form-dialog'
import type { Tables } from '@/types'

type IntercomCode = Tables<'intercom_codes'>

export function CodesTable({ intercomId }: { intercomId: string }) {
  const supabase = createBrowserSupabaseClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [codes, setCodes] = useState<IntercomCode[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const pageSize = 20

  async function loadCodes() {
    setLoading(true)
    let query = supabase
      .from('intercom_codes')
      .select('*', { count: 'exact' })
      .eq('intercom_id', intercomId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (search) {
      query = query.ilike('description', `%${search}%`)
    }

    const { data, count: total } = await query
    setCodes(data ?? [])
    setCount(total ?? 0)
    setLoading(false)
  }

  useEffect(() => { loadCodes() }, [page, search])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search by description..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="max-w-sm"
        />
        <CodeFormDialog intercomId={intercomId} />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono">{c.code}</TableCell>
                <TableCell>{c.description}</TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <CodeFormDialog intercomId={intercomId} code={c} />
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
