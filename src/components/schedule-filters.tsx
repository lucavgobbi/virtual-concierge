'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type IntercomCode = { id: string; code: string; description: string | null }

export function ScheduleFilters({
  codes,
  enabledFilter,
  codeFilter,
  onEnabledChange,
  onCodeChange,
}: {
  codes: IntercomCode[]
  enabledFilter: string
  codeFilter: string
  onEnabledChange: (v: string | null) => void
  onCodeChange: (v: string | null) => void
}) {
  return (
    <div className="flex items-center gap-4">
      <Select value={enabledFilter} onValueChange={onEnabledChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="enabled">Enabled</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
        </SelectContent>
      </Select>
      <Select value={codeFilter} onValueChange={onCodeChange}>
        <SelectTrigger className="w-60">
          <SelectValue placeholder="Filter by code" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All codes</SelectItem>
          {codes.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.code} — {c.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
