import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Wrench, X } from 'lucide-react'
import { api } from '../lib/api'
import { sessionStorage } from '../lib/sessionStorage'
import { trackSummaryView, trackBookingClick, trackEmailProvided } from '../lib/analytics'
import { trackMetaEvent, getMetaCookies } from '../lib/meta-pixel'
import type { Session, ConstraintCategory } from '../types'
import { InviteCodes } from '../components/summary/InviteCodes'

// Constraint configuration
const constraintConfig: Record<ConstraintCategory, {
  label: string
  tagline: string
  gradient: string
  bgGradient: string
  textColor: string
}> = {
  strategy: {
    label: 'Strategy Constraint',
    tagline: "Your offer isn't landing with the right people yet",
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/10 via-purple-500/5 to-transparent',
    textColor: 'text-violet-600',
  },
  execution: {
    label: 'Execution Constraint',
    tagline: "You know what to do, but can't get it done",
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    textColor: 'text-amber-600',
  },
  psychology: {
    label: 'Psychology Constraint',
    tagline: "Internal blocks are preventing you from taking action",
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    textColor: 'text-emerald-600',
  }
}

export default function Summary() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailProgress, setEmailProgress] = useState<string>('')
  const hasTrackedView = useRef(false)
  const [showExitPopup, setShowExitPopup] = useState(false)
  const hasShownExitPopup = useRef(false)
  const exitPopupEmailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!sessionId) {
      navigate('/')
      return
    }

    const fetchSession = async () => {
      try {
        const { session } = await api.getSession(sessionId)

        if (!session.constraint_category) {
          navigate(`/chat/${sessionId}`)
          return
        }

        setSession(session)
        setEmailSent(session.email_sent || false)

        if (!hasTrackedView.current) {
          trackSummaryView(sessionId)
          hasTrackedView.current = true
        }
      } catch (error) {
        console.error('Error fetching session:', error)
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [sessionId, navigate])

  useEffect(() => {
    if (session?.constraint_category) {
      sessionStorage.clear()
    }
  }, [session])

  // Exit intent detection - show popup when user moves to leave page
  const handleExitIntent = useCallback((e: MouseEvent) => {
    // Only trigger if mouse leaves from top of viewport
    if (e.clientY <= 0 && !emailSent && !hasShownExitPopup.current) {
      hasShownExitPopup.current = true
      setShowExitPopup(true)
    }
  }, [emailSent])

  useEffect(() => {
    // Only add listener if email hasn't been sent
    if (!emailSent && !loading) {
      document.addEventListener('mouseout', handleExitIntent)
      return () => {
        document.removeEventListener('mouseout', handleExitIntent)
      }
    }
  }, [emailSent, loading, handleExitIntent])

  // Handle email submission from exit popup
  const handleExitPopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = exitPopupEmailRef.current?.value
    if (!email || !session) return

    await handleEmailSubmit(email, 'exit_intent_summary')
    setShowExitPopup(false)
  }

  const handleEmailSubmit = async (email: string, source: string = 'summary_page') => {
    if (!session) return

    setSendingEmail(true)
    setEmailProgress('Saving your email...')

    try {
      if (!session.user_email) {
        const metaEventId = crypto.randomUUID()
        const metaCookies = getMetaCookies()
        trackMetaEvent('Lead', { content_name: 'email_capture' }, metaEventId)
        await api.updateSession(session.id, {
          user_email: email,
          meta_fbp: metaCookies.fbp,
          meta_fbc: metaCookies.fbc,
          meta_event_id: metaEventId,
        } as any)
        setSession({ ...session, user_email: email })
      }

      if (sessionId) {
        trackEmailProvided(sessionId, source)
      }

      setEmailProgress('Generating your personalized report...')
      await api.sendSummaryEmail(session.id)
      setEmailSent(true)
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setSendingEmail(false)
      setEmailProgress('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-page">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" />
        </div>
      </div>
    )
  }

  if (!session) return null

  const constraintType = (session.constraint_category?.toLowerCase() || 'strategy') as ConstraintCategory
  const config = constraintConfig[constraintType]
  const userName = session.user_name || 'there'

  // Routing: execution → MIST, strategy/energy → EC
  const isMIST = constraintType === 'execution'
  const bookingLink = isMIST
    ? import.meta.env.VITE_MIST_BOOKING_LINK || '#'
    : import.meta.env.VITE_EC_BOOKING_LINK || '#'

  // Build booking URL with sessionId (for webhook matching) and email (for pre-fill)
  const buildBookingUrl = () => {
    if (bookingLink === '#') return '#'
    const params = new URLSearchParams()
    if (sessionId) params.set('SESSIONID', sessionId) // YCBM custom field
    if (session.user_email) params.set('email', session.user_email)
    if (session.user_name) params.set('name', session.user_name)
    return `${bookingLink}?${params.toString()}`
  }
  const bookingUrl = buildBookingUrl()

  return (
    <div className="min-h-screen bg-gradient-page">
      {/* Hero Section - Above the Fold */}
      <div className={`relative overflow-hidden bg-gradient-to-b ${config.bgGradient} to-transparent`}>
        <div className="max-w-2xl mx-auto px-4 pt-12 pb-8">
          {/* Personalized Greeting */}
          <p className="text-center text-gray-500 text-sm font-medium uppercase tracking-wide mb-2">
            Your Assessment Results
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-8">
            {userName}, here's what's holding you back
          </h1>

          {/* Constraint Card - The Main Event */}
          <div className="group bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden
                          transition-all duration-300 hover:shadow-2xl hover:shadow-gray-300/50">
            {/* Constraint Type Badge */}
            <div className={`relative bg-gradient-to-r ${config.gradient} px-6 py-5`}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
              <p className="relative text-white/90 text-xs font-semibold uppercase tracking-wider mb-1">
                Your Primary Constraint
              </p>
              <h2 className="relative text-2xl md:text-3xl font-bold text-white">
                {config.label}
              </h2>
            </div>

            {/* Summary */}
            <div className="p-6 md:p-8 bg-gradient-to-b from-gray-50/50 to-white">
              <p className={`text-lg font-semibold ${config.textColor} mb-3`}>
                {config.tagline}
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                {session.constraint_summary || "Based on our conversation, this is the key area where focused attention will unlock your next level of growth."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - Immediately After Constraint */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-teal-50/60 to-white rounded-3xl p-7 md:p-9 border border-teal-100/80
                        shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(20,184,166,0.08)]
                        hover:border-teal-200/80 hover:shadow-[0_4px_16px_-3px_rgba(20,184,166,0.12),0_8px_24px_-4px_rgba(0,0,0,0.06)]
                        transition-all duration-300">
          {/* Headline */}
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
            {isMIST ? "Ready to Get It Built?" : "Ready to Break Through?"}
          </h3>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed mb-7 text-base md:text-lg tracking-wide">
            {isMIST
              ? "Talk to our implementation team about building the systems you need."
              : "Talk to a strategist who can help you get unstuck and moving forward."
            }
          </p>

          {/* CTA Button - Deep violet, brand-aligned */}
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (sessionId) {
                trackBookingClick(sessionId, isMIST ? 'MIST' : 'EC')
              }
            }}
            className="group w-full px-6 py-4 relative
                     bg-violet-700
                     text-white font-medium rounded-xl
                     transition-all duration-300 ease-out
                     flex items-center justify-center gap-2.5
                     text-base tracking-tight
                     shadow-[0_1px_2px_rgba(109,40,217,0.2),0_4px_12px_rgba(109,40,217,0.15)]
                     hover:bg-violet-600 hover:shadow-[0_1px_2px_rgba(109,40,217,0.25),0_8px_24px_rgba(109,40,217,0.2)]
                     active:bg-violet-800 active:shadow-[0_1px_2px_rgba(109,40,217,0.3)]
                     before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/[0.15] before:to-transparent before:pointer-events-none"
          >
            {isMIST ? <Wrench className="w-[18px] h-[18px] opacity-80" /> : <Calendar className="w-[18px] h-[18px] opacity-80" />}
            <span>{isMIST ? "Book Your Implementation Call" : "Book Your Strategy Session"}</span>
            <svg className="w-4 h-4 opacity-60 transition-all duration-300 group-hover:opacity-80 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>

          {/* Note */}
          <p className="text-xs text-gray-500/90 text-center mt-5 tracking-wide">
            Free 30-minute call • No obligation
          </p>
        </div>
      </div>

      {/* Email Summary Card */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className={`rounded-3xl p-7 md:p-9 border transition-all duration-300
                        ${emailSent
                          ? 'bg-gradient-to-br from-emerald-50/60 to-white border-emerald-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(16,185,129,0.08)]'
                          : 'bg-gradient-to-br from-violet-50/60 to-white border-violet-100/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(139,92,246,0.08)] hover:border-violet-200/80 hover:shadow-[0_4px_16px_-3px_rgba(139,92,246,0.12),0_8px_24px_-4px_rgba(0,0,0,0.06)]'
                        }`}>

          {emailSent ? (
            /* Submitted State */
            <>
              {/* Header with Submitted badge */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                  Get Your Personalized Summary
                </h3>
                <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Sent
                </span>
              </div>

              {/* Confirmation with email */}
              <p className="text-gray-600 leading-relaxed text-base md:text-lg tracking-wide flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>
                  Results sent to <span className="font-semibold text-gray-900">{session.user_email}</span>
                </span>
              </p>
            </>
          ) : (
            /* Email Collection State */
            <>
              {/* Headline */}
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-4">
                Get Your Personalized Summary
              </h3>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed mb-7 text-base md:text-lg tracking-wide">
                I'll send you a detailed summary of what we discovered, your readiness scores, and personalized next steps to move forward.
              </p>

              {/* Email form - stacked layout */}
              <form onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.querySelector('input'); if (input?.value) handleEmailSubmit(input.value); }} className="space-y-5">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    defaultValue={session.user_email || ''}
                    disabled={sendingEmail}
                    className="w-full px-5 py-4 pr-12 bg-gray-50/50
                             rounded-2xl border border-gray-300/80
                             focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 focus:bg-white
                             text-gray-900 placeholder:text-gray-400/80
                             transition-all duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed
                             hover:border-gray-400/90 hover:bg-white
                             focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08),0_2px_8px_-2px_rgba(0,0,0,0.1)]
                             text-base md:text-lg tracking-wide"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400/70">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="group w-full px-6 py-4 relative
                           bg-teal-600
                           text-white font-medium rounded-xl
                           transition-all duration-300 ease-out
                           flex items-center justify-center gap-2.5
                           text-base tracking-tight
                           shadow-[0_1px_2px_rgba(13,148,136,0.2),0_4px_12px_rgba(13,148,136,0.15)]
                           hover:bg-teal-500 hover:shadow-[0_1px_2px_rgba(13,148,136,0.25),0_8px_24px_rgba(13,148,136,0.2)]
                           active:bg-teal-700 active:shadow-[0_1px_2px_rgba(13,148,136,0.3)]
                           disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed
                           before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/[0.15] before:to-transparent before:pointer-events-none"
                >
                  {sendingEmail ? (
                    <>
                      <svg className="animate-spin h-[18px] w-[18px] opacity-80" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{emailProgress || 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Send My Summary</span>
                      <svg className="w-4 h-4 opacity-60 transition-all duration-300 group-hover:opacity-80 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Privacy note */}
                <p className="text-xs text-gray-500/90 text-center flex items-center justify-center gap-2 tracking-wide">
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Your email is safe. We respect your privacy.
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Invite Codes - hidden until tested and ready */}
      {/* TODO: Enable when invite system is tested. Set VITE_ENABLE_INVITE_CODES=true */}
      {import.meta.env.VITE_ENABLE_INVITE_CODES === 'true' && session.user_email && sessionId && (
        <div className="max-w-2xl mx-auto px-6 mt-8">
          <InviteCodes sessionId={sessionId} />
        </div>
      )}

      {/* Footer spacing */}
      <div className="h-8" />

      {/* Exit Intent Popup */}
      {showExitPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowExitPopup(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 fade-in duration-300">
            {/* Close button */}
            <button
              onClick={() => setShowExitPopup(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Content */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Wait! Don't lose your results
              </h3>
              <p className="text-gray-600">
                Enter your email to save your personalized assessment and get actionable next steps delivered to your inbox.
              </p>
            </div>

            {/* Email form */}
            <form onSubmit={handleExitPopupSubmit} className="space-y-4">
              <input
                ref={exitPopupEmailRef}
                type="email"
                placeholder="your@email.com"
                defaultValue={session?.user_email || ''}
                autoFocus
                className="w-full px-5 py-4 bg-gray-50/50
                         rounded-2xl border border-gray-300/80
                         focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 focus:bg-white
                         text-gray-900 placeholder:text-gray-400/80
                         transition-all duration-200
                         hover:border-gray-400/90 hover:bg-white
                         text-base"
              />

              <button
                type="submit"
                disabled={sendingEmail}
                className="w-full px-6 py-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700
                         text-white font-medium rounded-xl
                         transition-all duration-200
                         flex items-center justify-center gap-2
                         disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send My Summary</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowExitPopup(false)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                No thanks, I'll pass
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
