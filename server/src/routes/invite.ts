import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { generateCode } from '../services/invite/codeGenerator.js'

const router = Router()

const CODES_PER_SESSION = 3

// Generate invite codes for a session
router.post('/generate', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' })
    }

    // Check if codes already generated for this session
    const { data: existing } = await supabase
      .from('invite_codes')
      .select('code')
      .eq('generated_by_session_id', sessionId)

    if (existing && existing.length > 0) {
      return res.json({ codes: existing.map(e => e.code) })
    }

    // Get session email
    const { data: session } = await supabase
      .from('advisor_sessions')
      .select('user_email')
      .eq('id', sessionId)
      .single()

    // Generate unique codes with retry
    const codes: string[] = []
    for (let i = 0; i < CODES_PER_SESSION; i++) {
      let code: string
      let attempts = 0
      do {
        code = generateCode()
        attempts++
      } while (attempts < 10 && codes.includes(code))
      codes.push(code)
    }

    // Insert codes
    const { error } = await supabase.from('invite_codes').insert(
      codes.map(code => ({
        code,
        generated_by_session_id: sessionId,
        generated_by_email: session?.user_email || null,
      }))
    )

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Codes already generated' })
      }
      throw error
    }

    return res.json({ codes })
  } catch (error) {
    console.error('Generate invite codes error:', error)
    return res.status(500).json({ error: 'Failed to generate codes' })
  }
})

// Validate an invite code
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params

    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, code, redeemed_at, expires_at')
      .eq('code', code.toUpperCase())
      .single()

    if (error || !data) {
      return res.json({ valid: false, reason: 'not_found' })
    }

    if (data.redeemed_at) {
      return res.json({ valid: false, reason: 'already_redeemed' })
    }

    if (new Date(data.expires_at) < new Date()) {
      return res.json({ valid: false, reason: 'expired' })
    }

    return res.json({ valid: true, code: data.code })
  } catch (error) {
    console.error('Validate invite code error:', error)
    return res.status(500).json({ error: 'Failed to validate code' })
  }
})

// Redeem an invite code
router.post('/redeem', async (req, res) => {
  try {
    const { code, email } = req.body

    if (!code) {
      return res.status(400).json({ error: 'code required' })
    }

    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, redeemed_at, expires_at')
      .eq('code', code.toUpperCase())
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'Code not found' })
    }

    if (data.redeemed_at) {
      return res.status(400).json({ error: 'Code already redeemed' })
    }

    if (new Date(data.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code expired' })
    }

    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_by_email: email || null,
      })
      .eq('id', data.id)

    if (updateError) throw updateError

    return res.json({ success: true })
  } catch (error) {
    console.error('Redeem invite code error:', error)
    return res.status(500).json({ error: 'Failed to redeem code' })
  }
})

export default router
