import { NextRequest, NextResponse } from 'next/server'
import { lookupIntercomById, validateCode, logAccess } from '@/lib/services/access'
import {
  accessGrantedResponse,
  accessDeniedRedirectResponse,
  conciergeRedirectResponse,
  goodbyeResponse,
  errorResponse,
} from '@/lib/twilio/responses'
import { validateTwilioRequest } from '@/lib/twilio/validate'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_ATTEMPTS = parseInt(process.env.MAX_CODE_ATTEMPTS || '2', 10)
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(`twilio:handle-input:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    console.warn('[handle-input] Rate limited', { ip })
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  const formData = await request.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value as string })

  const from = (formData.get('From') as string) || ''
  const to = (formData.get('To') as string) || ''
  const callSid = (formData.get('CallSid') as string) || ''
  const digits = ((formData.get('Digits') as string) || '').replace(/\D/g, '')
  const intercomId = request.nextUrl.searchParams.get('intercomId') || ''
  const attempts = parseInt(request.nextUrl.searchParams.get('attempts') || '0', 10)

  try {
    const signature = request.headers.get('x-twilio-signature') || ''
    if (!validateTwilioRequest(request, params, signature)) {
      console.warn('[handle-input] Unauthorized request', { from, to, callSid, intercomId, digits })
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (!intercomId) {
      console.warn('[handle-input] Missing intercomId', { from, to, callSid, digits })
      return new NextResponse(goodbyeResponse(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Press 0 → concierge
    if (digits === '0') {
      const intercom = await lookupIntercomById(intercomId)
      if (!intercom) {
        console.warn('[handle-input] Concierge intercom not found', { intercomId, from, to, callSid })
        return new NextResponse(goodbyeResponse(), {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
      }
      console.log('[handle-input] Redirecting to concierge', { intercomId, conciergePhone: intercom.concierge_phone, from, to, callSid })
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
      console.warn('[handle-input] Invalid code format', { intercomId, digits, from, to, callSid })
      await logAccess({ intercomId, codeEntered: digits, status: 'invalid_code' })
      return sendErrorResponse(intercomId, attempts)
    }

    // Validate code
    const result = await validateCode(intercomId, digits, new Date())
    console.log('[handle-input] Code validation result', { intercomId, digits, status: result.status, granted: result.granted, callSid })

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
        console.warn('[handle-input] Granted intercom not found', { intercomId, callSid })
        return new NextResponse(goodbyeResponse(), {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
      }
      console.log('[handle-input] Access granted', { intercomId, digits, callSid })
      const body = accessGrantedResponse(intercom.dtmf_tone)
      return new NextResponse(body, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    return sendErrorResponse(intercomId, attempts)
  } catch (err) {
    console.error('[handle-input] Unhandled error', { intercomId, digits, attempts, from, to, callSid, error: String(err) })
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
