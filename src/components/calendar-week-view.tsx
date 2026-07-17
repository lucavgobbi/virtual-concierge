'use client'

import React from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

function getWeekDates(base: Date): Date[] {
  const start = new Date(base)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function CalendarWeekView({
  currentDate,
  schedules,
  onToggle,
}: {
  currentDate: Date
  schedules: Schedule[]
  onToggle: (id: string, enabled: boolean) => void
}) {
  const dates = getWeekDates(currentDate)

  function scheduleForDay(day: Date): Schedule[] {
    const dayStr = day.toISOString().slice(0, 10)
    const dow = day.getDay()
    return schedules.filter((s) => {
      if (s.type === 'date') return s.date === dayStr
      return s.week_day === dow
    })
  }

  return (
    <div className="overflow-auto rounded-md border">
      <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
        <div className="border-b border-r p-2 text-xs text-muted-foreground" />
        {dates.map((d, i) => (
          <div key={i} className="border-b p-2 text-center text-sm font-medium">
            {DAYS[d.getDay()]} {d.getDate()}
          </div>
        ))}
        {HOURS.map((hour) => (
          <React.Fragment key={hour}>
            <div key={`h-${hour}`} className="border-b border-r p-2 text-right text-xs text-muted-foreground">
              {String(hour).padStart(2, '0')}:00
            </div>
            {dates.map((_, di) => (
              <div key={`c-${hour}-${di}`} className="min-h-[40px] border-b p-1">
                {scheduleForDay(dates[di])
                  .filter((s) => {
                    const startH = parseInt(s.start_time.split(':')[0])
                    return startH === hour
                  })
                  .map((s) => (
                    <div
                      key={s.id}
                      className={`rounded px-1 py-0.5 text-xs ${s.enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{s.intercom_code.code}</span>
                        <button
                          onClick={() => onToggle(s.id, !s.enabled)}
                          className="text-[10px] underline"
                        >
                          {s.enabled ? 'on' : 'off'}
                        </button>
                      </div>
                      <div className="text-[10px] opacity-75">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
