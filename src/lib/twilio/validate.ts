import { NextRequest } from 'next/server'
import twilio from 'twilio'
import { getTwilioWebhookUrl } from './url'

export function validateTwilioRequest(
  request: NextRequest,
  params: Record<string, string>,
  signature: string | null
): boolean {
  if (!signature) return false
  const token = process.env.TWILIO_TOKEN
  if (!token) return false

  const url = getTwilioWebhookUrl(request)
  return twilio.validateRequest(token, signature, url, params)
}
