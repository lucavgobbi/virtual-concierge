'use client'

import { useRouter, useParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Intercom {
  id: string
  name: string
}

export function IntercomSelector({ intercoms }: { intercoms: Intercom[] }) {
  const router = useRouter()
  const params = useParams()
  const currentId = params.intercomId as string

  return (
    <Select
      value={currentId}
      onValueChange={(id) => router.push(`/admin/${id}/configuration`)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select intercom" />
      </SelectTrigger>
      <SelectContent>
        {intercoms.map((i) => (
          <SelectItem key={i.id} value={i.id}>
            {i.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
