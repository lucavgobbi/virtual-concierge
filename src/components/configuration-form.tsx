'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface IntercomConfig {
  id: string
  name: string
  greeting: string
  from_phone: string
  concierge_phone: string
  dtmf_tone: string
  enabled: boolean
}

export function ConfigurationForm({ config }: { config: IntercomConfig }) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    const data = {
      name: formData.get('name') as string,
      greeting: formData.get('greeting') as string,
      from_phone: formData.get('from_phone') as string,
      concierge_phone: formData.get('concierge_phone') as string,
      dtmf_tone: formData.get('dtmf_tone') as string,
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
        <textarea
          id="greeting"
          name="greeting"
          defaultValue={config.greeting}
          className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
          required
        />
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
