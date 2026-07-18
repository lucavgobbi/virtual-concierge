'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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

export function ScheduleDialog({
  schedule,
  onToggle,
  children,
}: {
  schedule: Schedule
  onToggle: (id: string, enabled: boolean) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  const scheduleInfo =
    schedule.type === 'weekday' && schedule.week_day !== null
      ? `Every ${DAY_NAMES[schedule.week_day]}, ${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`
      : schedule.date
        ? `${schedule.date}, ${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`
        : `${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="cursor-pointer flex-1 flex flex-col">
        {children}
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule.intercom_code.description || schedule.intercom_code.code}</DialogTitle>
          <DialogDescription>{scheduleInfo}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Switch id="schedule-enabled" checked={schedule.enabled} onCheckedChange={(checked) => { onToggle(schedule.id, checked); setOpen(false) }} />
          <Label htmlFor="schedule-enabled">{schedule.enabled ? 'Enabled' : 'Disabled'}</Label>
        </div>
      </DialogContent>
    </Dialog>
  )
}
