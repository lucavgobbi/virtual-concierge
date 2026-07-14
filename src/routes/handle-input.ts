import { Hono } from 'hono'
import prisma from '../db.js'
import { validateCode, logAccess } from '../services/access.js'
import {
  accessGrantedResponse,
  accessDeniedRedirectResponse,
  conciergeRedirectResponse,
  goodbyeResponse,
} from '../lib/twilio.js'

const app = new Hono()

const MAX_ATTEMPTS = 2

app.post('/handle-input', async (c) => {
  const formData = await c.req.parseBody()
  const digits = (formData.Digits as string) || ''
  const attempts = parseInt(c.req.query('attempts') || '0', 10)

  if (digits === '0') {
    const conciergePhone = process.env.CONCIERGE_PHONE || ''
    await logAccess(prisma, {
      codeEntered: '0',
      success: true,
      action: 'concierge_redirect',
    })
    const body = conciergeRedirectResponse(conciergePhone)
    return c.newResponse(body, 200, { 'Content-Type': 'text/xml' })
  }

  if (digits.length !== 5 || digits.startsWith('0')) {
    await logAccess(prisma, {
      codeEntered: digits,
      success: false,
      action: 'invalid_code',
    })
    return sendErrorResponse(c, attempts)
  }

  const result = await validateCode(prisma, digits, new Date())

  await logAccess(prisma, {
    customerId: result.customerId ?? undefined,
    codeEntered: result.codeEntered,
    success: result.granted,
    action: result.action,
    scheduleDateId: result.scheduleDateId ?? undefined,
    scheduleWeekdayId: result.scheduleWeekdayId ?? undefined,
  })

  if (result.granted) {
    const dtmfTone = process.env.DOOR_DTMF_TONE || '9'
    const body = accessGrantedResponse(dtmfTone)
    return c.newResponse(body, 200, { 'Content-Type': 'text/xml' })
  }

  return sendErrorResponse(c, attempts)
})

function sendErrorResponse(c: any, attempts: number): Response {
  const nextAttempt = attempts + 1

  if (nextAttempt >= MAX_ATTEMPTS) {
    return c.newResponse(goodbyeResponse(), 200, { 'Content-Type': 'text/xml' })
  }

  return c.newResponse(
    accessDeniedRedirectResponse(nextAttempt),
    200,
    { 'Content-Type': 'text/xml' }
  )
}

export default app
