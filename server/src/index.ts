import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import sessionRoutes from './routes/session.js'
import chatRoutes from './routes/chat.js'
import promptRoutes from './routes/prompt.js'
import scribeRoutes from './routes/scribe.js'
import ttsRoutes from './routes/tts.js'
import emailRoutes from './routes/email.js'
import webhookRoutes from './routes/webhook.js'
import adminRoutes from './routes/admin.js'
import analyticsRoutes from './routes/analytics.js'
import bookingWebhookRoutes from './routes/booking-webhook.js'
import inviteRoutes from './routes/invite.js'
import resendWebhookRoutes from './routes/resend-webhook.js'
import signalSessionRoutes from './routes/signal-session.js'
import { setupVoiceWebSocket } from './routes/voice.js'

dotenv.config({ path: '../.env' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Trust proxy (Render runs behind a reverse proxy)
// This ensures req.ip returns the real client IP from X-Forwarded-For
app.set('trust proxy', 1)

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
// Resend webhook needs raw body for signature verification — mount before express.json()
app.use('/api/webhook/resend', express.raw({ type: 'application/json' }), resendWebhookRoutes)

app.use(express.json())

// Serve static files from client build
const clientBuildPath = path.join(__dirname, '../../client/dist')
app.use(express.static(clientBuildPath))

// Routes
app.use('/api/sessions', sessionRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/prompt', promptRoutes)
app.use('/api/scribe', scribeRoutes)
app.use('/api/tts', ttsRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/webhook', webhookRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/booking', bookingWebhookRoutes)
app.use('/api/invite', inviteRoutes)
app.use('/api/signal-session', signalSessionRoutes)

// Public: active split tests (no auth)
app.get('/api/split-tests/active', async (_req, res) => {
  try {
    const { supabase } = await import('./config/supabase.js')
    const { data, error } = await supabase
      .from('split_tests')
      .select('id, test_name, location, variants, winner')
      .eq('active', true)

    if (error) throw error
    res.json({ tests: data || [] })
  } catch (error) {
    console.error('Active split tests error:', error)
    res.json({ tests: [] })
  }
})

// Health check - simple version for fast response
// Database connectivity is verified on actual API calls
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve index.html for all non-API routes (SPA fallback)
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'))
})

// Create HTTP server (needed for WebSocket)
const server = createServer(app)

// Setup WebSocket for voice conversations
setupVoiceWebSocket(server)

// Start server with error handling
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`WebSocket available at ws://localhost:${PORT}/api/voice`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`)
    console.error(`\nThis usually means another server process is still running.`)
    console.error(`To fix this, run one of these commands:\n`)
    console.error(`  npm run stop          # Stop all running servers`)
    console.error(`  npm run dev:clean     # Stop existing servers and start fresh`)
    console.error(`  npm run restart       # Restart the server\n`)
    process.exit(1)
  } else {
    console.error('Server error:', error)
    process.exit(1)
  }
})
