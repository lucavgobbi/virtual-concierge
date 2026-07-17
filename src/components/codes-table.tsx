'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Code</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Created</th>
              <th className="px-4 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-4 py-2 font-mono">{c.code}</td>
                <td className="px-4 py-2">{c.description}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-2">
                  <CodeFormDialog intercomId={intercomId} code={c} />
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
