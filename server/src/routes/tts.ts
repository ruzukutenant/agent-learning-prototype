import { Router } from 'express'
import { elevenlabs } from '../config/elevenlabs.js'

const router = Router()

// POST /api/tts/convert - Convert text to speech
router.post('/convert', async (req, res) => {
  try {
    const { text, voiceId } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' })
    }

    // Use a default voice if not specified (Rachel - professional, warm)
    const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'

    // Generate speech using ElevenLabs TTS
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`TTS failed: ${response.status} - ${error}`)
    }

    // Stream the audio back to client
    res.setHeader('Content-Type', 'audio/mpeg')

    if (response.body) {
      const reader = response.body.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }

    res.end()
  } catch (error) {
    console.error('Error generating speech:', error)
    res.status(500).json({ error: 'Failed to generate speech' })
  }
})

export default router
