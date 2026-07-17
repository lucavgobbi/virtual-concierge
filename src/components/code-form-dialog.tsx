'use client'

import { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import type { Tables } from '@/types'

type IntercomCode = Tables<'intercom_codes'>

export function CodeFormDialog({
  intercomId,
  code,
}: {
  intercomId: string
  code?: IntercomCode
}) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError('')

    const data = {
      intercom_id: intercomId,
      description: formData.get('description') as string,
      code: formData.get('code') as string,
      enabled: formData.get('enabled') === 'on',
    }

    let hasError = false

    if (code) {
      const { error: err } = await supabase
        .from('intercom_codes')
        .update(data)
        .eq('id', code.id)
      if (err) { setError(err.message); hasError = true }
    } else {
      const { error: err } = await supabase
        .from('intercom_codes')
        .insert(data)
      if (err) { setError(err.message); hasError = true }
    }

    setSaving(false)

    if (!hasError) {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        {code ? 'Edit' : 'Add Code'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{code ? 'Edit Code' : 'Add Code'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={code?.description ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code (5 digits, no leading zero)</Label>
            <Input
              id="code"
              name="code"
              defaultValue={code?.code ?? ''}
              required
              pattern="[1-9][0-9]{4}"
              maxLength={5}
              readOnly={!!code}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="enabled" name="enabled" defaultChecked={code?.enabled ?? true} />
            <Label htmlFor="enabled">Enabled</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
