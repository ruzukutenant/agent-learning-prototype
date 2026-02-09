import { useState, useRef, useEffect } from 'react'
import { getComponentVariant, type ComponentVariant } from '../../lib/splitTest'
import { trackComponentImpression, trackComponentConversion } from '../../lib/analytics'

interface EndOfConversationEmailCardProps {
  onSubmit: (email: string) => Promise<void>
  onSkip: () => void
  sessionId?: string
}

export function EndOfConversationEmailCard({ onSubmit, onSkip, sessionId }: EndOfConversationEmailCardProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [variant, setVariant] = useState<ComponentVariant | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasTrackedImpression = useRef(false)

  useEffect(() => {
    getComponentVariant('component:eoc_email').then(v => {
      setVariant(v)
      if (v && !hasTrackedImpression.current) {
        trackComponentImpression(v.testName, v.variant, 'eoc_email', sessionId)
        hasTrackedImpression.current = true
      }
    })
  }, [sessionId])

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(email)
      if (variant) {
        trackComponentConversion(variant.testName, variant.variant, 'eoc_email', sessionId)
      }
      setIsSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="self-start w-full max-w-lg animate-in fade-in duration-300">
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-br from-teal-50/60 to-white rounded-2xl border border-teal-100/80">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-base font-medium text-teal-800">
            Saved! We'll send your report shortly.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="self-start w-full max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-gradient-to-br from-teal-50/60 to-white rounded-2xl overflow-hidden
                      border border-teal-100/80
                      shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(20,184,166,0.08)]">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600
                            flex items-center justify-center shadow-lg shadow-teal-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">
                {variant?.headline || 'Get insights to move your business forward'}
              </h4>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {variant?.description || "Enter your email and we'll send detailed insights straight to your inbox — including your essential insights and recommended next steps."}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-5">
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="eoc-email-input" className="sr-only">Email address</label>
              <input
                ref={inputRef}
                id="eoc-email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="your@email.com"
                disabled={isSubmitting}
                className={`w-full px-4 py-3
                         bg-white rounded-xl border text-base
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
              className="px-5 py-3
                       bg-teal-600 text-white text-base font-semibold rounded-xl
                       hover:bg-teal-500
                       active:bg-teal-700 active:scale-[0.98]
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
                variant?.button_text || 'Send Report'
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 animate-in fade-in duration-200">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onSkip}
            className="mt-3 text-xs text-gray-400 hover:text-gray-500 transition-colors"
          >
            Continue without email
          </button>
        </form>
      </div>
    </div>
  )
}
