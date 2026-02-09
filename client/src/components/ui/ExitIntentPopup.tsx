import { useState, useEffect, useCallback } from 'react'
import { trackEvent } from '../../lib/analytics'

type PopupState = 'initial' | 'feedback' | 'reminder' | 'thank-you'
type Variant = 'landing' | 'name-collection'

interface ExitIntentPopupProps {
  variant?: Variant
  onStartAssessment?: () => void
}

const STORAGE_KEY = 'cma_exit_intent_shown'
const MOBILE_IDLE_MS = 45000

export function ExitIntentPopup({ variant = 'landing', onStartAssessment }: ExitIntentPopupProps) {
  const [show, setShow] = useState(false)
  const [state, setState] = useState<PopupState>('initial')
  const [feedback, setFeedback] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dismiss = useCallback(() => {
    setShow(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setShow(true)
        localStorage.setItem(STORAGE_KEY, 'true')
        document.removeEventListener('mouseout', handleMouseLeave)
        trackEvent({ eventType: 'exit_intent_shown', eventData: { page: variant } })
      }
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          setShow(true)
          localStorage.setItem(STORAGE_KEY, 'true')
          trackEvent({ eventType: 'exit_intent_shown', eventData: { page: variant } })
        }
      }, MOBILE_IDLE_MS)
    }

    if (isMobile) {
      resetIdleTimer()
      window.addEventListener('touchstart', resetIdleTimer)
      window.addEventListener('scroll', resetIdleTimer)
    } else {
      document.addEventListener('mouseout', handleMouseLeave)
    }

    return () => {
      document.removeEventListener('mouseout', handleMouseLeave)
      if (idleTimer) clearTimeout(idleTimer)
      if (isMobile) {
        window.removeEventListener('touchstart', resetIdleTimer)
        window.removeEventListener('scroll', resetIdleTimer)
      }
    }
  }, [variant])

  const handleNotInterested = () => {
    setState('feedback')
    trackEvent({ eventType: 'exit_intent_not_interested', eventData: { page: variant } })
  }

  const handleNotNow = () => {
    setState('reminder')
    trackEvent({ eventType: 'exit_intent_not_now', eventData: { page: variant, email_provided: false } })
  }

  const handleSubmitFeedback = async () => {
    setSubmitting(true)
    await trackEvent({
      eventType: 'exit_intent_feedback',
      eventData: { page: variant, response: 'not_interested', feedback_text: feedback },
    })
    setSubmitting(false)
    setState('thank-you')
    setTimeout(dismiss, 2000)
  }

  const handleSubmitReminder = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setSubmitting(true)
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '/api'
      await fetch(`${API_BASE}/email/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      await trackEvent({
        eventType: 'exit_intent_not_now',
        eventData: { page: variant, email_provided: true },
      })
    } catch {
      // silently fail
    }
    setSubmitting(false)
    setState('thank-you')
    setTimeout(dismiss, 2000)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
        {state === 'initial' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Before you go...
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {variant === 'name-collection'
                ? "You were about to start your assessment. We'd hate for you to miss out on the clarity it provides."
                : "Most coaches and consultants are stuck on something they can't quite see. A 10-minute conversation could change that."}
            </p>
            <div className="flex flex-col gap-3">
              {variant === 'landing' && onStartAssessment && (
                <button
                  onClick={() => { dismiss(); onStartAssessment() }}
                  className="w-full px-6 py-3 bg-brand-teal text-white font-semibold rounded-xl
                             hover:bg-teal-600 active:scale-[0.98] transition-all duration-200
                             shadow-md shadow-teal-500/20"
                >
                  Start My Free Assessment
                </button>
              )}
              <button
                onClick={handleNotNow}
                className="w-full px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl
                           hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200"
              >
                Not the right time
              </button>
              <button
                onClick={handleNotInterested}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors pt-1"
              >
                This isn't for me
              </button>
            </div>
          </>
        )}

        {state === 'feedback' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              We'd love to learn from you
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              What were you hoping to find?
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Your feedback helps us improve..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal mb-4"
              autoFocus
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSubmitFeedback}
                disabled={submitting}
                className="w-full px-6 py-3 bg-brand-teal text-white font-semibold rounded-xl
                           hover:bg-teal-600 active:scale-[0.98] transition-all duration-200
                           disabled:opacity-50 shadow-md shadow-teal-500/20"
              >
                {submitting ? 'Sending...' : 'Submit'}
              </button>
              <button
                onClick={dismiss}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {state === 'reminder' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              We'll send you a reminder
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              Drop your email and we'll send a link so you can come back when the timing is better.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal mb-4"
              autoFocus
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSubmitReminder}
                disabled={submitting || !email}
                className="w-full px-6 py-3 bg-brand-teal text-white font-semibold rounded-xl
                           hover:bg-teal-600 active:scale-[0.98] transition-all duration-200
                           disabled:opacity-50 shadow-md shadow-teal-500/20"
              >
                {submitting ? 'Sending...' : 'Send me a reminder'}
              </button>
              <button
                onClick={dismiss}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {state === 'thank-you' && (
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-gray-900">Thank you!</p>
            <p className="text-gray-500 text-sm mt-1">We appreciate your time.</p>
          </div>
        )}
      </div>
    </div>
  )
}
