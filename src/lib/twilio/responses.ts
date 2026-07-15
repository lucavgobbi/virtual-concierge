import twilio from 'twilio'

const { VoiceResponse } = twilio.twiml

export interface GreetingParams {
  intercomId: string
  greeting: string
  attempts: number
}

export function greetingResponse(params: GreetingParams): string {
  const twiml = new VoiceResponse()
  const gather = twiml.gather({
    numDigits: 5,
    timeout: 5,
    action: `/api/twilio/handle-input?intercomId=${params.intercomId}&attempts=${params.attempts}`,
    method: 'POST',
  })
  gather.say({ voice: 'alice' }, params.greeting)
  return twiml.toString()
}

export function accessGrantedResponse(dtmfTone: string): string {
  const twiml = new VoiceResponse()
  twiml.say({ voice: 'alice' }, 'Access granted.')
  twiml.pause({ length: 1 })
  const digits = twiml.addChild('SendDigits', {})
  digits.addText(dtmfTone)
  twiml.hangup()
  return twiml.toString()
}

export function accessDeniedRedirectResponse(intercomId: string, attempts: number): string {
  const twiml = new VoiceResponse()
  twiml.say({ voice: 'alice' }, 'Invalid or unauthorized code.')
  twiml.redirect(
    { method: 'POST' },
    `/api/twilio/incoming-call?intercomId=${intercomId}&attempts=${attempts}`
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
