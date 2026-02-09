import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../../.env') })

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('Missing ELEVENLABS_API_KEY environment variable')
}

if (!process.env.ELEVENLABS_AGENT_ID) {
  throw new Error('Missing ELEVENLABS_AGENT_ID environment variable')
}

export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

export const AGENT_ID = process.env.ELEVENLABS_AGENT_ID

// Conversational AI configuration
export const CONVERSATION_CONFIG = {
  // These settings can be tuned based on testing
  language: 'en', // Auto-detect by default
  turnDetection: {
    mode: 'server_vad', // Voice Activity Detection on server side
  },
}
