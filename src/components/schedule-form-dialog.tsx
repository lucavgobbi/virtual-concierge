'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function ScheduleFormDialog({ intercomId }: { intercomId: string }) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [codes, setCodes] = useState<{ id: string; code: string; description: string | null }[]>([])
  const [type, setType] = useState<'weekday' | 'date'>('weekday')

  useEffect(() => {
    supabase
      .from('intercom_codes')
      .select('id, code, description')
      .eq('intercom_id', intercomId)
      .eq('enabled', true)
      .then(({ data }) => setCodes(data ?? []))
  }, [intercomId, supabase])

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError('')
    const data = {
      intercom_code_id: formData.get('intercom_code_id') as string,
      type,
      date: type === 'date' ? (formData.get('date') as string) : null,
      week_day: type === 'weekday' ? parseInt(formData.get('week_day') as string) : null,
      start_time: formData.get('start_time') as string,
      end_time: formData.get('end_time') as string,
      enabled: formData.get('enabled') === 'on',
    }

    const { error: err } = await supabase.from('schedules').insert(data)
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        New Schedule
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Schedule</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Access Code</Label>
            <Select name="intercom_code_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Select code" />
              </SelectTrigger>
              <SelectContent>
                {codes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as 'weekday' | 'date')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekday">Weekly (day of week)</SelectItem>
                <SelectItem value="date">Specific date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'weekday' ? (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select name="week_day" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input id="start_time" name="start_time" type="time" defaultValue="08:00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input id="end_time" name="end_time" type="time" defaultValue="18:00" required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Switch id="enabled" name="enabled" defaultChecked />
            <Label htmlFor="enabled">Enabled</Label>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Create Schedule'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
