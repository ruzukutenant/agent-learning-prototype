import { useState } from 'react'
import { Button } from '../ui/Button'

interface EmailCaptureProps {
  onSubmit: (email: string) => void
  isLoading?: boolean
  existingEmail?: string | null
  compact?: boolean
}

// Email validation regex - requires local part, @, domain, and TLD
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EmailCapture({ onSubmit, isLoading = false, existingEmail, compact = false }: EmailCaptureProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (email: string): boolean => {
    return EMAIL_REGEX.test(email.trim())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const emailToSend = (existingEmail || email).trim()

    if (!emailToSend) {
      setError('Please enter your email address')
      return
    }

    if (!validateEmail(emailToSend)) {
      setError('Please enter a valid email address')
      return
    }

    setError('')
    onSubmit(emailToSend)
  }

  // Compact mode - just the form, no decoration
  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        {existingEmail ? (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Send to <span className="font-medium text-gray-900">{existingEmail}</span>
            </p>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3
                       bg-gradient-to-r from-violet-600 to-indigo-600
                       hover:from-violet-700 hover:to-indigo-700
                       text-white font-semibold rounded-xl
                       shadow-lg shadow-violet-500/25
                       transition-all duration-200
                       hover:shadow-xl hover:scale-[1.02]
                       active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send My Report
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            {/* Input */}
            <div className="relative flex-1 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none
                            transition-all group-focus-within:text-violet-600 group-focus-within:scale-110">
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-4
                         bg-white
                         rounded-xl
                         border-2 border-violet-200 hover:border-violet-400
                         text-gray-900 placeholder:text-gray-400
                         focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100
                         transition-all duration-200
                         shadow-sm hover:shadow-md
                         disabled:opacity-50 text-base
                         cursor-text"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !email}
              className="px-6 py-4 sm:px-8
                       bg-violet-600 hover:bg-violet-700
                       text-white font-semibold rounded-xl
                       shadow-lg shadow-violet-500/30
                       transition-all duration-200
                       hover:shadow-xl hover:shadow-violet-500/40
                       hover:-translate-y-0.5
                       active:translate-y-0 active:shadow-md
                       disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed disabled:translate-y-0
                       flex items-center justify-center gap-2
                       whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="sm:inline hidden">Sending...</span>
                </>
              ) : (
                <>
                  <span>Unlock</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}
      </form>
    )
  }

  // Full mode - with decoration
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 via-white to-teal-50
                    border-2 border-purple-100 shadow-xl shadow-purple-500/10">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-teal/10 to-brand-purple/10
                      rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-brand-purple/10 to-brand-teal/10
                      rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative p-8">
        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-teal to-brand-purple
                        flex items-center justify-center shadow-lg shadow-purple-500/25">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Get Your Full Assessment Report
            </h3>
            {existingEmail ? (
              <p className="text-gray-600 leading-relaxed">
                We'll send a detailed breakdown of your results, next steps, and personalized recommendations to{' '}
                <span className="font-semibold text-gray-900">{existingEmail}</span>
              </p>
            ) : (
              <p className="text-gray-600 leading-relaxed">
                We'll send a detailed breakdown of your results, next steps, and personalized recommendations
                straight to your inbox.
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {existingEmail ? (
            // Already have email - just show send button
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="min-w-[220px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending Report...
                  </span>
                ) : (
                  'Send My Report'
                )}
              </Button>
            </div>
          ) : (
            // Need email - show input field
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  disabled={isLoading}
                  className="w-full px-6 py-4 bg-white/80 backdrop-blur rounded-2xl
                           border-2 border-gray-200
                           text-gray-900 placeholder:text-gray-400
                           focus:outline-none focus:border-brand-purple/50 focus:bg-white
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200
                           shadow-sm hover:shadow-md"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !email}
                className="sm:w-auto whitespace-nowrap min-w-[180px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send My Report'
                )}
              </Button>
            </div>
          )}
        </form>

        {/* Privacy Note */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </div>
  )
}
