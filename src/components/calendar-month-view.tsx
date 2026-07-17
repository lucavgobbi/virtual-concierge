'use client'

interface Schedule {
  id: string
  start_time: string
  end_time: string
  type: string
  date: string | null
  week_day: number | null
  enabled: boolean
  intercom_code: { code: string }
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
}: {
  year: number
  month: number
  schedules: Schedule[]
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
                      .filter((s) => s.enabled)
                      .slice(0, 3)
                      .map((s) => (
                        <div
                          key={s.id}
                          className="rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-700"
                        >
                          {s.intercom_code.code}
                        </div>
                      ))}
                    {schedulesForDay(day).filter((s) => s.enabled).length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{schedulesForDay(day).filter((s) => s.enabled).length - 3} more
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
