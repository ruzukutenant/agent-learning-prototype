import { Router } from 'express'

const router = Router()

// POST /api/scribe/token - Generate single-use token for Scribe
router.post('/token', async (req, res) => {
  try {
    const response = await fetch(
      'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Force English language detection
          language_code: 'en',
          model_id: 'scribe_v1',
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get Scribe token: ${response.status} - ${error}`)
    }

    const data = await response.json()
    res.json({ token: data.token })
  } catch (error) {
    console.error('Error generating Scribe token:', error)
    res.status(500).json({ error: 'Failed to generate Scribe token' })
  }
})

export default router
