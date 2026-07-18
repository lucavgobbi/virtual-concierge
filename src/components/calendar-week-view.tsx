'use client'

import React from 'react'
import { ScheduleDialog } from '@/components/schedule-dialog'

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
            <div className="border-b border-r p-2 text-right text-xs text-muted-foreground">
              {String(hour).padStart(2, '0')}:00
            </div>
            {dates.map((_, di) => (
              <div key={`c-${hour}-${di}`} className="min-h-[36px] border-b border-r p-0.5 flex flex-col">
                {scheduleForDay(dates[di])
                  .filter((s) => {
                    const [startH, startM] = s.start_time.split(':').map(Number)
                    const [endH, endM] = s.end_time.split(':').map(Number)
                    const slotStart = hour * 60
                    const slotEnd = (hour + 1) * 60
                    const scheduleStart = startH * 60 + startM
                    const scheduleEnd = endH * 60 + endM
                    return scheduleStart < slotEnd && scheduleEnd > slotStart
                  })
                  .map((s) => {
                    const [startH, startM] = s.start_time.split(':').map(Number)
                    const [endH, endM] = s.end_time.split(':').map(Number)
                    const scheduleStartMin = startH * 60 + startM
                    const scheduleEndMin = endH * 60 + endM
                    const slotStartMin = hour * 60
                    const slotEndMin = (hour + 1) * 60
                    const isStart = scheduleStartMin >= slotStartMin && scheduleStartMin < slotEndMin
                    const isEnd = scheduleEndMin >= slotStartMin && scheduleEndMin <= slotEndMin
                    const isSingleHour = isStart && scheduleEndMin <= slotEndMin

                    const continuous = !isSingleHour
                    let blockClass = 'rounded-md py-1'
                    if (continuous) {
                      if (isStart) blockClass = 'rounded-t-md pt-1 pb-0'
                      else if (isEnd) blockClass = 'rounded-b-md pb-1 pt-0'
                      else blockClass = 'rounded-none py-0'
                    }

                    return (
                      <ScheduleDialog key={s.id} schedule={s} onToggle={onToggle}>
                        <div
                          className={`flex-1 px-1 text-xs ${s.enabled ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-200 hover:bg-gray-300'} ${blockClass}`}
                        >
                          <div className="truncate">{s.intercom_code.description || s.intercom_code.code}</div>
                        </div>
                      </ScheduleDialog>
                    )
                  })}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
