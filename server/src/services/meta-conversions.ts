/**
 * Meta Conversions API (CAPI) — server-side event tracking.
 * No-ops if META_PIXEL_ID or META_ACCESS_TOKEN are not set.
 */

import { createHash } from 'crypto'

const PIXEL_ID = process.env.META_PIXEL_ID
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN
const API_VERSION = 'v22.0'

interface UserData {
  email?: string
  ip?: string
  userAgent?: string
  fbp?: string
  fbc?: string
  sourceUrl?: string
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/**
 * Send a single event to Meta Conversions API.
 * Fire-and-forget — logs errors but never throws.
 */
export function sendMetaEvent(
  eventName: string,
  eventId: string | null,
  userData: UserData
): void {
  if (!PIXEL_ID || !ACCESS_TOKEN) return

  const user_data: Record<string, any> = {}
  if (userData.email) user_data.em = [sha256(userData.email)]
  if (userData.ip) user_data.client_ip_address = userData.ip
  if (userData.userAgent) user_data.client_user_agent = userData.userAgent
  if (userData.fbp) user_data.fbp = userData.fbp
  if (userData.fbc) user_data.fbc = userData.fbc

  const event: Record<string, any> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data,
  }

  if (eventId) event.event_id = eventId
  if (userData.sourceUrl) event.event_source_url = userData.sourceUrl

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [event],
      access_token: ACCESS_TOKEN,
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[MetaConversions] ${eventName} failed (${res.status}):`, body)
      } else {
        console.log(`[MetaConversions] ${eventName} sent successfully`)
      }
    })
    .catch((err) => {
      console.error(`[MetaConversions] ${eventName} error:`, err.message)
    })
}
