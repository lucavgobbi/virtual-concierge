import { redirect } from 'next/navigation'

export default function IntercomPage({
  params,
}: {
  params: { intercomId: string }
}) {
  redirect(`/admin/${params.intercomId}/configuration`)
}
