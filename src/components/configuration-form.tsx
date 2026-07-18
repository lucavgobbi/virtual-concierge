'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Santiago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
]

interface IntercomConfig {
  id: string
  name: string
  greeting: string
  from_phone: string
  concierge_phone: string
  dtmf_tone: string
  enabled: boolean
  timezone: string
}

export function ConfigurationForm({ config }: { config: IntercomConfig }) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [saving, setSaving] = useState(false)
  const [timezone, setTimezone] = useState(config.timezone || 'UTC')

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    const data = {
      name: formData.get('name') as string,
      greeting: formData.get('greeting') as string,
      from_phone: formData.get('from_phone') as string,
      concierge_phone: formData.get('concierge_phone') as string,
      dtmf_tone: formData.get('dtmf_tone') as string,
      timezone: timezone,
      enabled: formData.get('enabled') === 'on',
    }

    const { error } = await supabase
      .from('intercoms')
      .update(data)
      .eq('id', config.id)

    setSaving(false)

    if (!error) {
      router.refresh()
    }
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={config.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="greeting">Greeting</Label>
        <Textarea id="greeting" name="greeting" defaultValue={config.greeting} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="from_phone">From Phone</Label>
        <Input id="from_phone" name="from_phone" defaultValue={config.from_phone} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="concierge_phone">Concierge Phone</Label>
        <Input id="concierge_phone" name="concierge_phone" defaultValue={config.concierge_phone} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dtmf_tone">DTMF Tone</Label>
        <Input id="dtmf_tone" name="dtmf_tone" defaultValue={config.dtmf_tone} required />
      </div>
      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="enabled" name="enabled" defaultChecked={config.enabled} />
        <Label htmlFor="enabled">Enabled</Label>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
