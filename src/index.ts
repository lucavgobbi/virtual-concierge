import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import incomingRoutes from './routes/incoming.js'
import handleInputRoutes from './routes/handle-input.js'
import { logError } from './lib/logger.js'

process.on('unhandledRejection', (reason) => {
  logError('unhandledRejection', reason)
})

process.on('uncaughtException', (error) => {
  logError('uncaughtException', error)
})

const app = new Hono()

app.route('/', incomingRoutes)
app.route('/', handleInputRoutes)

const port = parseInt(process.env.PORT || '3000', 10)

serve({ fetch: app.fetch, port })
