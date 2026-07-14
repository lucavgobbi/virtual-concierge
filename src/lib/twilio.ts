import twilio from 'twilio'

const { VoiceResponse } = twilio.twiml

export function greetingResponse(attempts: number): string {
  const message = process.env.GREETING_MESSAGE || 'Welcome. Enter your 5-digit code or press 0 for concierge.'
  const twiml = new VoiceResponse()
  const gather = twiml.gather({
    numDigits: 5,
    timeout: 5,
    action: `/handle-input?attempts=${attempts}`,
    method: 'POST',
  })
  gather.say({ voice: 'alice' }, message)
  return twiml.toString()
}

export function accessGrantedResponse(dtmfTone: string): string {
  const twiml = new VoiceResponse()
  twiml.say({ voice: 'alice' }, 'Access granted.')
  twiml.pause({ length: 1 })
  const digits = twiml.addChild('SendDigits', {})
  digits.addText(dtmfTone)
  return twiml.toString()
}

export function accessDeniedRedirectResponse(attempts: number): string {
  const twiml = new VoiceResponse()
  twiml.say({ voice: 'alice' }, 'Invalid or unauthorized code.')
  twiml.redirect(
    { method: 'POST' },
    `/incoming-call?attempts=${attempts}`
  )
  return twiml.toString()
}

export function conciergeRedirectResponse(phoneNumber: string): string {
  const twiml = new VoiceResponse()
  twiml.dial(phoneNumber)
  return twiml.toString()
}

export function goodbyeResponse(): string {
  const twiml = new VoiceResponse()
  twiml.say({ voice: 'alice' }, 'Goodbye.')
  twiml.hangup()
  return twiml.toString()
}

export function errorResponse(): string {
  const twiml = new VoiceResponse()
  twiml.say({ voice: 'alice' }, 'An unexpected error occurred. Please try again later.')
  twiml.hangup()
  return twiml.toString()
}
