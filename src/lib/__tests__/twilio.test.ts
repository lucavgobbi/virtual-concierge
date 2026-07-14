import { describe, it, expect, beforeEach } from 'vitest'
import {
  greetingResponse,
  accessGrantedResponse,
  accessDeniedRedirectResponse,
  conciergeRedirectResponse,
  goodbyeResponse,
  errorResponse,
} from '../twilio.js'

describe('greetingResponse', () => {
  it('includes Gather with numDigits=5 and timeout=5', () => {
    const result = greetingResponse(0)
    expect(result).toContain('<Gather')
    expect(result).toContain('numDigits="5"')
    expect(result).toContain('timeout="5"')
  })

  it('includes attempts parameter in action URL', () => {
    const result = greetingResponse(1)
    expect(result).toContain('/handle-input?attempts=1')
  })

  it('uses default greeting when GREETING_MESSAGE is not set', () => {
    const result = greetingResponse(0)
    expect(result).toContain('Enter your 5-digit code or press 0 for concierge')
  })

  it('uses custom greeting from GREETING_MESSAGE env var', () => {
    process.env.GREETING_MESSAGE = 'Bem-vindo! Digite seu codigo.'
    const result = greetingResponse(0)
    expect(result).toContain('Bem-vindo! Digite seu codigo.')
    delete process.env.GREETING_MESSAGE
  })
})

describe('accessGrantedResponse', () => {
  it('includes SendDigits with the provided tone', () => {
    const result = accessGrantedResponse('9')
    expect(result).toContain('<SendDigits>9</SendDigits>')
  })

  it('includes access granted message', () => {
    const result = accessGrantedResponse('9')
    expect(result).toContain('Access granted')
  })
})

describe('accessDeniedRedirectResponse', () => {
  it('includes Redirect to incoming-call with next attempts', () => {
    const result = accessDeniedRedirectResponse(1)
    expect(result).toContain('/incoming-call?attempts=1')
    expect(result).toContain('<Redirect')
  })

  it('includes error message', () => {
    const result = accessDeniedRedirectResponse(0)
    expect(result).toContain('Invalid or unauthorized code')
  })
})

describe('conciergeRedirectResponse', () => {
  it('includes Dial with the phone number', () => {
    const result = conciergeRedirectResponse('+1234567890')
    expect(result).toContain('<Dial>+1234567890</Dial>')
  })
})

describe('goodbyeResponse', () => {
  it('includes Hangup', () => {
    const result = goodbyeResponse()
    expect(result).toContain('<Hangup/>')
  })

  it('includes goodbye message', () => {
    const result = goodbyeResponse()
    expect(result).toContain('Goodbye')
  })
})

describe('errorResponse', () => {
  it('includes Hangup', () => {
    const result = errorResponse()
    expect(result).toContain('<Hangup/>')
  })

  it('includes error message', () => {
    const result = errorResponse()
    expect(result).toContain('unexpected error')
  })
})
