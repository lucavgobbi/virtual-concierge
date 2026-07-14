import { Hono } from 'hono'
import { greetingResponse } from '../lib/twilio.js'

const app = new Hono()

app.get('/incoming-call', (c) => {
  return c.text('OK', 200)
})

app.post('/incoming-call', (c) => {
  const attempts = parseInt(c.req.query('attempts') || '0', 10)
  const body = greetingResponse(attempts)
  return c.newResponse(body, 200, { 'Content-Type': 'text/xml' })
})

export default app
