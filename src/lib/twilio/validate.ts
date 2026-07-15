import twilio from 'twilio'

export function validateTwilioRequest(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  if (!signature) return false
  const token = process.env.TWILIO_TOKEN
  if (!token) return false
  return twilio.validateRequest(token, signature, url, params)
}
