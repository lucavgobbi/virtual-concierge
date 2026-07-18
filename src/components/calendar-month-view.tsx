'use client'

import { ScheduleDialog } from '@/components/schedule-dialog'

interface Schedule {
  id: string
  start_time: string
  end_time: string
  type: string
  date: string | null
  week_day: number | null
  enabled: boolean
  intercom_code: { code: string; description: string | null }
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()
  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = new Array(startPad).fill(null)
  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d))
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

export function CalendarMonthView({
  year,
  month,
  schedules,
  onToggle,
}: {
  year: number
  month: number
  schedules: Schedule[]
  onToggle: (id: string, enabled: boolean) => void
}) {
  const weeks = getMonthGrid(year, month)

  function schedulesForDay(day: Date): Schedule[] {
    const dayStr = day.toISOString().slice(0, 10)
    const dow = day.getDay()
    return schedules.filter((s) => {
      if (s.type === 'date') return s.date === dayStr
      return s.week_day === dow
    })
  }

  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => (
            <div key={di} className="min-h-[100px] border-b border-r p-1">
              {day && (
                <>
                  <div className="text-sm font-medium">{day.getDate()}</div>
                  <div className="mt-1 space-y-0.5">
                    {schedulesForDay(day)
                      .slice(0, 3)
                      .map((s) => (
                        <ScheduleDialog key={s.id} schedule={s} onToggle={onToggle}>
                          <div
                            className={`h-full rounded px-1 py-0.5 text-xs cursor-pointer ${s.enabled ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-200 hover:bg-gray-300'}`}
                          >
                            {s.intercom_code.description || s.intercom_code.code}
                          </div>
                        </ScheduleDialog>
                      ))}
                    {schedulesForDay(day).length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{schedulesForDay(day).length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
