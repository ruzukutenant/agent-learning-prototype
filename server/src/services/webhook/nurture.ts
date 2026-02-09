import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

export async function sendNurtureWebhook(params: {
  sessionId: string
  userName: string
  userEmail: string
  constraintCategory: string
  constraintSummary: string
  clarityScore: number
  confidenceScore: number
  capacityScore: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const webhookUrl = process.env.NURTURE_WEBHOOK_URL

    if (!webhookUrl) {
      console.warn('NURTURE_WEBHOOK_URL not configured - skipping webhook')
      return { success: true } // Don't fail if webhook not configured
    }

    // Calculate follow-up date (7 days from now)
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + 7)

    const payload = {
      event: 'advisor_nurture_path',
      timestamp: new Date().toISOString(),
      session_id: params.sessionId,
      user: {
        name: params.userName,
        email: params.userEmail,
      },
      constraint: {
        category: params.constraintCategory,
        summary: params.constraintSummary,
      },
      readiness_scores: {
        clarity: params.clarityScore,
        confidence: params.confidenceScore,
        capacity: params.capacityScore,
      },
      follow_up_date: followUpDate.toISOString(),
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Webhook failed:', response.status, errorText)
      return { success: false, error: `Webhook returned ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    console.error('Webhook error:', error)
    return { success: false, error: 'Failed to send webhook' }
  }
}
