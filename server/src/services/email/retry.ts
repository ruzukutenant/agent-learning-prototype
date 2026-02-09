import { supabase } from '../../config/supabase.js'

interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
}

const RETRY_CONFIGS: Record<string, RetryConfig> = {
  summary: { maxAttempts: 3, baseDelayMs: 1000 },
  call_taker_notification: { maxAttempts: 3, baseDelayMs: 1000 },
  resume: { maxAttempts: 2, baseDelayMs: 1000 },
  reminder: { maxAttempts: 1, baseDelayMs: 0 },
  daily_alert: { maxAttempts: 1, baseDelayMs: 0 },
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryable(error: any): boolean {
  const status = error?.statusCode || error?.status
  if (status === 429) return true
  if (status >= 500) return true
  return false
}

/**
 * Send an email with retry logic and exponential backoff.
 * Returns the Resend email ID on success.
 */
export async function sendWithRetry<T extends { id?: string }>(
  emailType: string,
  sendFn: () => Promise<{ data: T | null; error: any }>,
): Promise<{ data: T | null; error: any; attempts: number }> {
  const config = RETRY_CONFIGS[emailType] || { maxAttempts: 1, baseDelayMs: 0 }
  let lastError: any = null
  let lastAttempt = 0

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    lastAttempt = attempt
    const result = await sendFn()

    if (!result.error) {
      return { data: result.data, error: null, attempts: attempt }
    }

    lastError = result.error
    console.error(`[Email Retry] ${emailType} attempt ${attempt}/${config.maxAttempts} failed:`, result.error)

    if (attempt < config.maxAttempts && isRetryable(result.error)) {
      const delay = config.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500
      console.log(`[Email Retry] Retrying in ${Math.round(delay)}ms...`)
      await sleep(delay)
    } else {
      break
    }
  }

  return { data: null, error: lastError, attempts: lastAttempt }
}

/**
 * Check if a recipient has a prior hard bounce on record.
 */
/**
 * Check if a recipient has a prior hard bounce, complaint, or suppression on record.
 */
export async function hasHardBounce(recipient: string): Promise<boolean> {
  const { data } = await supabase
    .from('email_events')
    .select('id')
    .eq('recipient', recipient)
    .in('status', ['bounced', 'complained', 'suppressed'])
    .limit(1)

  return (data?.length ?? 0) > 0
}

/**
 * Log an email send to the email_events table.
 */
export async function logEmailEvent(params: {
  resendEmailId?: string
  emailType: string
  recipient: string
  sessionId?: string
  status?: string
  attempts?: number
}): Promise<void> {
  const { error } = await supabase.from('email_events').insert({
    resend_email_id: params.resendEmailId || null,
    email_type: params.emailType,
    recipient: params.recipient,
    session_id: params.sessionId || null,
    status: params.status || 'sent',
    attempts: params.attempts || 1,
  })

  if (error) {
    console.error('[Email Events] Failed to log event:', error)
  }
}
