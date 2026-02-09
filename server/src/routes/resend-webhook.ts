import { Router, type Request } from 'express'
import { Webhook } from 'svix'
import { supabase } from '../config/supabase.js'

const router = Router()

/**
 * POST /api/webhook/resend
 *
 * Handles Resend delivery webhooks (email.delivered, email.bounced, email.complained).
 * Verifies signature using svix (Resend's signing method).
 *
 * This route is mounted with express.raw() in index.ts so req.body is a Buffer.
 *
 * Setup in Resend dashboard:
 * 1. Go to Webhooks
 * 2. Add endpoint: https://coachmiraadvisor.onrender.com/api/webhook/resend
 * 3. Select events: email.delivered, email.bounced, email.complained
 * 4. Copy signing secret -> set as RESEND_WEBHOOK_SECRET env var
 */
router.post('/', async (req: Request, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Resend Webhook] RESEND_WEBHOOK_SECRET not configured')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  // Verify signature
  const svixId = req.headers['svix-id'] as string
  const svixTimestamp = req.headers['svix-timestamp'] as string
  const svixSignature = req.headers['svix-signature'] as string

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing svix headers' })
  }

  let payload: any
  try {
    const wh = new Webhook(secret)
    // req.body is a Buffer from express.raw() — convert to string for signature verification
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body)
    payload = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    console.error('[Resend Webhook] Signature verification failed:', err)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const eventType = payload.type as string
  const data = payload.data

  console.log(`[Resend Webhook] Received ${eventType} for ${data?.email_id}`)

  try {
    if (eventType === 'email.delivered') {
      await supabase
        .from('email_events')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('resend_email_id', data.email_id)

    } else if (eventType === 'email.bounced') {
      const bounceType = data.bounce?.type === 'hard' ? 'hard' : 'soft'
      const bounceReason = data.bounce?.description || data.bounce?.message || null

      await supabase
        .from('email_events')
        .update({
          status: 'bounced',
          bounce_type: bounceType,
          bounce_reason: bounceReason,
          updated_at: new Date().toISOString(),
        })
        .eq('resend_email_id', data.email_id)

      // On hard bounce, mark session using recipient from our email_events record
      if (bounceType === 'hard') {
        await markSessionBounced(data.email_id)
      }

    } else if (eventType === 'email.complained') {
      await supabase
        .from('email_events')
        .update({
          status: 'complained',
          updated_at: new Date().toISOString(),
        })
        .eq('resend_email_id', data.email_id)

      await markSessionBounced(data.email_id)

    } else if (eventType === 'email.failed') {
      await supabase
        .from('email_events')
        .update({
          status: 'failed',
          bounce_reason: data.error?.message || null,
          updated_at: new Date().toISOString(),
        })
        .eq('resend_email_id', data.email_id)

    } else if (eventType === 'email.suppressed') {
      await supabase
        .from('email_events')
        .update({
          status: 'suppressed',
          bounce_reason: data.reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('resend_email_id', data.email_id)

      // Suppressed emails mean Resend is blocking sends to this recipient
      await markSessionBounced(data.email_id)
    }

    return res.json({ received: true })
  } catch (error) {
    console.error('[Resend Webhook] Processing error:', error)
    return res.status(500).json({ error: 'Processing failed' })
  }
})

/**
 * Look up the recipient from our email_events table by Resend email ID,
 * then mark all sessions for that recipient as bounced.
 */
async function markSessionBounced(resendEmailId: string) {
  if (!resendEmailId) return

  const { data: events } = await supabase
    .from('email_events')
    .select('recipient')
    .eq('resend_email_id', resendEmailId)
    .limit(1)

  const email = events?.[0]?.recipient
  if (!email) {
    console.warn(`[Resend Webhook] No email_events record found for resend ID ${resendEmailId}, cannot mark session bounced`)
    return
  }

  const { error } = await supabase
    .from('advisor_sessions')
    .update({ email_bounced: true })
    .eq('user_email', email)

  if (error) {
    console.error('[Resend Webhook] Failed to mark session bounced:', error)
  } else {
    console.log(`[Resend Webhook] Marked sessions as bounced for ${email}`)
  }
}

export default router
