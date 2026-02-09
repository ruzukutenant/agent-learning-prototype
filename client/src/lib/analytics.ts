// Funnel tracking service

export type FunnelEvent =
  | 'landing_viewed'
  | 'name_collection_started'
  | 'chat_started'
  | 'chat_completed'
  | 'email_provided'
  | 'summary_viewed'
  | 'booking_clicked'
  | 'handoff_card_shown'
  | 'handoff_card_clicked'
  | 'component_impression'
  | 'component_conversion'
  | 'exit_intent_shown'
  | 'exit_intent_not_interested'
  | 'exit_intent_not_now'
  | 'exit_intent_feedback'

interface TrackEventParams {
  eventType: FunnelEvent
  sessionId?: string
  eventData?: Record<string, any>
}

const API_BASE = import.meta.env.VITE_API_URL || '/api'

/**
 * Track a funnel event
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    await fetch(`${API_BASE}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: params.sessionId,
        eventType: params.eventType,
        eventData: params.eventData,
      }),
    })

    // Log in development
    if (import.meta.env.DEV) {
      console.log('[Analytics]', params.eventType, params.sessionId, params.eventData)
    }
  } catch (error) {
    // Silently fail - don't break user experience if tracking fails
    console.error('Analytics tracking error:', error)
  }
}

/**
 * Track landing page view
 */
export function trackLandingView(metadata?: Record<string, any>): void {
  trackEvent({ eventType: 'landing_viewed', eventData: metadata })
}

/**
 * Track name collection start
 */
export function trackNameCollectionStart(sessionId: string): void {
  trackEvent({
    eventType: 'name_collection_started',
    sessionId,
  })
}

/**
 * Track first chat message (engagement)
 * Includes landing page split test info if available (for conversion tracking)
 */
export function trackChatStart(sessionId: string): void {
  // Check if user was in a landing page split test
  const STORAGE_PREFIX = 'cma_split_'
  let splitTestData: { splitTest: string; variant: string } | undefined

  // Look for any landing page test assignment in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      const testName = key.slice(STORAGE_PREFIX.length)
      const variant = localStorage.getItem(key)
      if (variant) {
        splitTestData = { splitTest: testName, variant }
        break // Use the first one found (typically only one landing test)
      }
    }
  }

  trackEvent({
    eventType: 'chat_started',
    sessionId,
    eventData: splitTestData,
  })
}

/**
 * Track chat completion (constraint identified)
 */
export function trackChatCompletion(sessionId: string, constraintCategory: string): void {
  trackEvent({
    eventType: 'chat_completed',
    sessionId,
    eventData: { constraintCategory },
  })
}

/**
 * Track email provided
 * @param source Where the email was captured: 'save_progress' (exit intent/mid-chat modal),
 *               'summary_page' (main summary page form), 'exit_intent_summary' (summary page exit popup)
 */
export function trackEmailProvided(sessionId: string, source?: string): void {
  trackEvent({
    eventType: 'email_provided',
    sessionId,
    eventData: source ? { source } : undefined,
  })
}

/**
 * Track handoff card shown (the "See Summary & Book Call" card rendered in chat)
 */
export function trackHandoffCardShown(sessionId: string): void {
  trackEvent({
    eventType: 'handoff_card_shown',
    sessionId,
  })
}

/**
 * Track handoff card clicked
 */
export function trackHandoffCardClicked(sessionId: string): void {
  trackEvent({
    eventType: 'handoff_card_clicked',
    sessionId,
  })
}

/**
 * Track summary page view
 */
export function trackSummaryView(sessionId: string): void {
  trackEvent({
    eventType: 'summary_viewed',
    sessionId,
  })
}

/**
 * Track a component split test impression (component rendered with test variant)
 */
export function trackComponentImpression(testName: string, variant: string, componentType: string, sessionId?: string): void {
  trackEvent({
    eventType: 'component_impression',
    sessionId,
    eventData: { splitTest: testName, variant, componentType },
  })
}

/**
 * Track a component split test conversion (user interacted with the component)
 */
export function trackComponentConversion(testName: string, variant: string, componentType: string, sessionId?: string): void {
  trackEvent({
    eventType: 'component_conversion',
    sessionId,
    eventData: { splitTest: testName, variant, componentType },
  })
}

/**
 * Track booking link click
 */
export function trackBookingClick(sessionId: string, endpoint: 'EC' | 'MIST' | 'NURTURE'): void {
  trackEvent({
    eventType: 'booking_clicked',
    sessionId,
    eventData: { endpoint },
  })
}
