import { Router } from 'express'
import { supabase } from '../config/supabase.js'
import { sendNurtureWebhook } from '../services/webhook/nurture.js'

const router = Router()

router.post('/nurture', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' })
    }

    // Fetch session
    const { data: session, error: fetchError } = await supabase
      .from('advisor_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Validate session has required data
    if (!session.user_email) {
      return res.status(400).json({ error: 'Session has no email address' })
    }

    if (!session.constraint_category) {
      return res.status(400).json({ error: 'Session incomplete - no constraint identified' })
    }

    // Check if webhook already sent
    if (session.webhook_sent) {
      return res.status(400).json({ error: 'Webhook already sent for this session' })
    }

    // Send webhook
    const webhookResult = await sendNurtureWebhook({
      sessionId: session.id,
      userName: session.user_name || 'User',
      userEmail: session.user_email,
      constraintCategory: session.constraint_category,
      constraintSummary: session.constraint_summary || 'Constraint identified.',
      clarityScore: session.clarity_score || 5,
      confidenceScore: session.confidence_score || 5,
      capacityScore: session.capacity_score || 5,
    })

    if (!webhookResult.success) {
      return res.status(500).json({ error: webhookResult.error || 'Failed to send webhook' })
    }

    // Update session
    const { error: updateError } = await supabase
      .from('advisor_sessions')
      .update({
        webhook_sent: true,
        webhook_sent_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Failed to update session after webhook send:', updateError)
      // Don't fail the request - webhook was sent successfully
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Webhook send error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
