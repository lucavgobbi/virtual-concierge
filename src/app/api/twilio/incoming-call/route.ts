import { NextRequest, NextResponse } from 'next/server'
import { lookupIntercom, lookupIntercomById } from '@/lib/services/access'
import { greetingResponse, goodbyeResponse } from '@/lib/twilio/responses'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const to = (formData.get('To') as string) || ''
  const attempts = parseInt(request.nextUrl.searchParams.get('attempts') || '0', 10)
  const intercomIdParam = request.nextUrl.searchParams.get('intercomId') || ''

  const intercom = intercomIdParam
    ? await lookupIntercomById(intercomIdParam)
    : await lookupIntercom(to)

  if (!intercom) {
    const body = goodbyeResponse()
    return new NextResponse(body, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  const body = greetingResponse({
    intercomId: intercom.id,
    greeting: intercom.greeting,
    attempts,
  })

  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
