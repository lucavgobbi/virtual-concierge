import { NextRequest, NextResponse } from 'next/server'
import { lookupIntercomById, validateCode, logAccess } from '@/lib/services/access'
import {
  accessGrantedResponse,
  accessDeniedRedirectResponse,
  conciergeRedirectResponse,
  goodbyeResponse,
  errorResponse,
} from '@/lib/twilio/responses'

const MAX_ATTEMPTS = 2

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const digits = (formData.get('Digits') as string) || ''
    const intercomId = request.nextUrl.searchParams.get('intercomId') || ''
    const attempts = parseInt(request.nextUrl.searchParams.get('attempts') || '0', 10)

    if (!intercomId) {
      return new NextResponse(goodbyeResponse(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Press 0 → concierge
    if (digits === '0') {
      const intercom = await lookupIntercomById(intercomId)
      if (!intercom) {
        return new NextResponse(goodbyeResponse(), {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
      }
      await logAccess({
        intercomId,
        codeEntered: '0',
        status: 'concierge_redirect',
      })
      const body = conciergeRedirectResponse(intercom.concierge_phone)
      return new NextResponse(body, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Invalid format
    if (digits.length !== 5 || digits.startsWith('0')) {
      await logAccess({ intercomId, codeEntered: digits, status: 'invalid_code' })
      return sendErrorResponse(intercomId, attempts)
    }

    // Validate code
    const result = await validateCode(intercomId, digits, new Date())

    await logAccess({
      intercomId,
      codeEntered: digits,
      status: result.status,
      intercomCodeId: result.intercomCodeId ?? undefined,
      scheduleId: result.scheduleId ?? undefined,
    })

    if (result.granted) {
      const intercom = await lookupIntercomById(intercomId)
      if (!intercom) {
        return new NextResponse(goodbyeResponse(), {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
      }
      const body = accessGrantedResponse(intercom.dtmf_tone)
      return new NextResponse(body, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    return sendErrorResponse(intercomId, attempts)
  } catch {
    await logAccess({ intercomId: '', codeEntered: '', status: 'error' })
    return new NextResponse(errorResponse(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}

function sendErrorResponse(intercomId: string, attempts: number): NextResponse {
  const nextAttempt = attempts + 1

  if (nextAttempt >= MAX_ATTEMPTS) {
    return new NextResponse(goodbyeResponse(), {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  const body = accessDeniedRedirectResponse(intercomId, nextAttempt)
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
