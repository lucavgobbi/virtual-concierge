import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import incomingRoutes from './routes/incoming.js'
import handleInputRoutes from './routes/handle-input.js'

const app = new Hono()

app.route('/', incomingRoutes)
app.route('/', handleInputRoutes)

const port = parseInt(process.env.PORT || '3000', 10)

console.log(`Virtual concierge starting on port ${port}`)

serve({ fetch: app.fetch, port })
