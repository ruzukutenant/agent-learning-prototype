import { useEffect, useRef, useState, useCallback } from 'react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'
import { LearningBadge, type BadgeType } from './LearningBadge'
import { trackHandoffCardShown, trackHandoffCardClicked, trackComponentImpression, trackComponentConversion, trackEmailProvided } from '../../lib/analytics'
import { getComponentVariant, type ComponentVariant } from '../../lib/splitTest'
import type { Message } from '../../types'

interface MessageBubbleProps {
  message: Message
  badge?: BadgeType | null
  isInsightMessage?: boolean
  isHandoffMessage?: boolean  // Show summary button on final message
  sessionId?: string  // For analytics tracking
  onViewSummary?: () => void  // Handler for summary navigation
  hasEmail?: boolean  // Whether user has already provided email
  onEmailSubmit?: (email: string) => Promise<void>  // Email submit handler for handoff card
}

export function MessageBubble({
  message,
  badge,
  isInsightMessage = false,
  isHandoffMessage = false,
  sessionId,
  onViewSummary,
  hasEmail = false,
  onEmailSubmit,
}: MessageBubbleProps) {
  const isAdvisor = message.speaker === 'advisor'
  const hasTrackedHandoffShown = useRef(false)
  const [handoffVariant, setHandoffVariant] = useState<ComponentVariant | null>(null)

  // Load handoff card split test variant
  useEffect(() => {
    if (isHandoffMessage && onViewSummary) {
      getComponentVariant('component:handoff_card').then(v => setHandoffVariant(v))
    }
  }, [isHandoffMessage, onViewSummary])

  // Track when handoff card is shown
  useEffect(() => {
    if (isHandoffMessage && onViewSummary && sessionId && !hasTrackedHandoffShown.current) {
      trackHandoffCardShown(sessionId)
      if (handoffVariant) {
        trackComponentImpression(handoffVariant.testName, handoffVariant.variant, 'handoff_card', sessionId)
      }
      hasTrackedHandoffShown.current = true
    }
  }, [isHandoffMessage, onViewSummary, sessionId, handoffVariant])

  // Custom markdown styling
  const markdownStyles = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li>{children}</li>,
  }

  return (
    <div
      className={clsx('max-w-[85%] md:max-w-[75%]', {
        'self-start': isAdvisor,
        'self-end': !isAdvisor,
      })}
    >
      {isAdvisor ? (
        // Advisor message: markdown rendered, optional badge for special moments
        <div className="space-y-2">
          {/* Learning badge (if present) */}
          {badge && (
            <div className="animate-in fade-in zoom-in duration-500">
              <LearningBadge type={badge} />
            </div>
          )}

          {/* Message content - plain text on gradient, no card */}
          <div className={clsx(
            'group/msg animate-in fade-in slide-in-from-bottom-2 duration-300 relative',
            isInsightMessage && 'border-l-4 border-amber-400 pl-4'
          )}>
            <span className="text-xs font-semibold text-brand-purple uppercase tracking-wide block mb-2">Mira</span>
            <div className="text-gray-800 text-lg leading-relaxed">
              <ReactMarkdown components={markdownStyles}>{message.message_text}</ReactMarkdown>
            </div>
            <CopyButton text={message.message_text} />
          </div>

          {/* Handoff card for final message */}
          {isHandoffMessage && onViewSummary && (
            <HandoffCard
              hasEmail={hasEmail}
              onEmailSubmit={onEmailSubmit}
              onViewSummary={onViewSummary}
              sessionId={sessionId}
              handoffVariant={handoffVariant}
            />
          )}
        </div>
      ) : (
        // User message: white card with subtle shadow
        <div className="bg-white rounded-3xl px-6 py-5
                        shadow-[0_2px_16px_-4px_rgba(0,0,0,0.1)]
                        animate-in fade-in slide-in-from-bottom-2 duration-300">
          {message.message_text === '__VOICE_PROCESSING__' ? (
            // Voice processing placeholder - show subtle loading indicator
            <div className="flex items-center gap-3 text-gray-400">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-brand-purple/60 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-brand-purple/60 rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-brand-purple/60 rounded-full animate-pulse [animation-delay:300ms]" />
              </div>
              <span className="text-sm font-medium text-brand-purple/70">Processing...</span>
            </div>
          ) : (
            <div className="text-gray-800 text-lg leading-relaxed">
              <ReactMarkdown components={markdownStyles}>{message.message_text}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HandoffCard({
  hasEmail,
  onEmailSubmit,
  onViewSummary,
  sessionId,
  handoffVariant,
}: {
  hasEmail: boolean
  onEmailSubmit?: (email: string) => Promise<void>
  onViewSummary: () => void
  sessionId?: string
  handoffVariant: ComponentVariant | null
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Autofocus email input after entrance animation
  useEffect(() => {
    if (!hasEmail) {
      const timer = setTimeout(() => inputRef.current?.focus(), 600)
      return () => clearTimeout(timer)
    }
  }, [hasEmail])

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email'); return }
    if (!validateEmail(email)) { setError('Please enter a valid email address'); return }

    setIsSubmitting(true)
    try {
      await onEmailSubmit?.(email)
      if (sessionId) {
        trackHandoffCardClicked(sessionId)
        trackEmailProvided(sessionId, 'end_of_conversation')
      }
      if (handoffVariant && sessionId) {
        trackComponentConversion(handoffVariant.testName, handoffVariant.variant, 'handoff_card', sessionId)
      }
      onViewSummary()
    } catch {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleSkipToSummary = () => {
    if (sessionId) trackHandoffCardClicked(sessionId)
    if (handoffVariant && sessionId) {
      trackComponentConversion(handoffVariant.testName, handoffVariant.variant, 'handoff_card', sessionId)
    }
    onViewSummary()
  }

  // User already has email — show simple CTA
  if (hasEmail) {
    return (
      <div className="mt-6 bg-gradient-to-br from-teal-50/60 to-white rounded-2xl p-6
                      border border-teal-100/80
                      shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(20,184,166,0.08)]
                      animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600
                          flex items-center justify-center shadow-lg shadow-teal-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {handoffVariant?.headline || 'Ready for Your Next Step'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {handoffVariant?.description || 'Review your insights and book your free consultation'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSkipToSummary}
          className="group w-full px-6 py-4 relative bg-teal-600 text-white font-semibold rounded-xl
                     transition-all duration-300 ease-out
                     shadow-[0_1px_2px_rgba(13,148,136,0.2),0_4px_12px_rgba(13,148,136,0.15)]
                     hover:bg-teal-500 hover:shadow-[0_1px_2px_rgba(13,148,136,0.25),0_8px_24px_rgba(13,148,136,0.2)]
                     active:bg-teal-700
                     before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/[0.12] before:to-transparent before:pointer-events-none
                     flex items-center justify-center gap-2"
        >
          <span>{handoffVariant?.button_text || 'See Summary & Book Call'}</span>
          <svg className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    )
  }

  // No email yet — show email-gated handoff
  return (
    <div className="mt-6 bg-gradient-to-br from-teal-50/60 to-white rounded-2xl overflow-hidden
                    border border-teal-100/80
                    shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(20,184,166,0.08)]
                    animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600
                          flex items-center justify-center shadow-lg shadow-teal-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {handoffVariant?.headline || 'Your Personalized Summary Is Ready'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {handoffVariant?.description || "Enter your email to get your full summary with key insights, recommended next steps, and a link to book your free consultation."}
            </p>
          </div>
        </div>
      </div>

      {/* Email form */}
      <form onSubmit={handleEmailSubmit} className="px-6 pb-5">
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="handoff-email-input" className="sr-only">Email address</label>
            <input
              ref={inputRef}
              id="handoff-email-input"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="your@email.com"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 bg-white rounded-xl border text-base
                       ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-teal-200 focus:border-teal-400 focus:ring-teal-500/20'}
                       focus:ring-4 focus:outline-none
                       text-gray-900 placeholder:text-gray-400
                       transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed`}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-3 bg-teal-600 text-white text-base font-semibold rounded-xl
                     hover:bg-teal-500 active:bg-teal-700 active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200
                     flex items-center gap-1.5 flex-shrink-0"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <span>{handoffVariant?.button_text || 'See My Summary'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 animate-in fade-in duration-200">{error}</p>
        )}
        <button
          type="button"
          onClick={handleSkipToSummary}
          className="mt-3 text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          Skip — view summary without email
        </button>
      </form>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="absolute -bottom-1 right-0 p-1.5 rounded-lg
                 text-gray-300 hover:text-gray-500 hover:bg-gray-100
                 opacity-0 group-hover/msg:opacity-100 transition-all duration-200"
      aria-label="Copy message"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}
