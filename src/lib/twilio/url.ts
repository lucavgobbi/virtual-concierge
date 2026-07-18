import { NextRequest } from 'next/server'

export function getTwilioWebhookUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')

  if (!host) {
    return request.url
  }

  const path = request.nextUrl.pathname + request.nextUrl.search
  return `${proto}://${host}${path}`
}
