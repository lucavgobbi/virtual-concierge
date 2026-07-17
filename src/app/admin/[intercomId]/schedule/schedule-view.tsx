'use client'

import { useState, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CalendarWeekView } from '@/components/calendar-week-view'
import { CalendarMonthView } from '@/components/calendar-month-view'
import { ScheduleFilters } from '@/components/schedule-filters'
import { ScheduleFormDialog } from '@/components/schedule-form-dialog'
import type { Database } from '@/types'

type Schedule = Database['public']['Tables']['schedules']['Row'] & {
  intercom_code: { code: string; description: string | null }
}

export function ScheduleView({
  intercomId,
  initialSchedules,
  codes,
}: {
  intercomId: string
  initialSchedules: Schedule[]
  codes: { id: string; code: string; description: string | null }[]
}) {
  const supabase = createBrowserSupabaseClient()
  const [view, setView] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [enabledFilter, setEnabledFilter] = useState('all')
  const [codeFilter, setCodeFilter] = useState('all')
  const [schedules, setSchedules] = useState(initialSchedules)

  const filteredSchedules = schedules.filter((s) => {
    if (enabledFilter === 'enabled' && !s.enabled) return false
    if (enabledFilter === 'disabled' && s.enabled) return false
    if (codeFilter !== 'all' && s.intercom_code_id !== codeFilter) return false
    return true
  })

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    await supabase.from('schedules').update({ enabled }).eq('id', id)
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s))
    )
  }, [supabase])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ScheduleFilters
          codes={codes}
          enabledFilter={enabledFilter}
          codeFilter={codeFilter}
          onEnabledChange={(v) => v && setEnabledFilter(v)}
          onCodeChange={(v) => v && setCodeFilter(v)}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === 'week' ? 'month' : 'week')}>
            {view === 'week' ? 'Month' : 'Week'}
          </Button>
          <ScheduleFormDialog intercomId={intercomId} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {view === 'week' ? (
        <CalendarWeekView
          currentDate={currentDate}
          schedules={filteredSchedules}
          onToggle={handleToggle}
        />
      ) : (
        <CalendarMonthView
          year={currentDate.getFullYear()}
          month={currentDate.getMonth()}
          schedules={filteredSchedules}
        />
      )}
    </div>
  )
}
