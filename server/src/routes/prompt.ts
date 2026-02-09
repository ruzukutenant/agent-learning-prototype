import { Router } from 'express'
import { loadSystemPrompt, saveSystemPrompt } from '../services/ai/prompts.js'

const router = Router()

// GET /api/prompt - Get current system prompt
router.get('/', async (req, res) => {
  try {
    const prompt = await loadSystemPrompt()
    res.json({ prompt })
  } catch (error) {
    console.error('Error loading prompt:', error)
    res.status(500).json({ error: 'Failed to load prompt' })
  }
})

// PUT /api/prompt - Update system prompt
router.put('/', async (req, res) => {
  try {
    const { prompt } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    await saveSystemPrompt(prompt)
    res.json({ success: true })
  } catch (error) {
    console.error('Error saving prompt:', error)
    res.status(500).json({ error: 'Failed to save prompt' })
  }
})

export default router
