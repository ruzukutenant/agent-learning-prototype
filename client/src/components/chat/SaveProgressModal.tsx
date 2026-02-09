import { useState } from 'react'

interface SaveProgressModalProps {
  onSubmit: (email: string) => Promise<void> | void
  onCancel: () => void
  defaultEmail?: string
}

export function SaveProgressModal({ onSubmit, onCancel, defaultEmail = '' }: SaveProgressModalProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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
      setIsSuccess(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm md:max-w-md animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 md:p-10 text-center">
            {/* Success checkmark */}
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mb-5 shadow-lg shadow-green-500/30 animate-in zoom-in-50 duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              You're all set!
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Check your inbox for a link to resume your conversation anytime.
            </p>

            <p className="text-sm text-gray-500 mb-6">
              Sent to <span className="font-medium text-gray-700">{email}</span>
            </p>

            <button
              onClick={onCancel}
              className="w-full px-5 py-3.5
                       bg-gradient-to-r from-brand-teal to-brand-purple
                       text-white font-semibold rounded-xl
                       hover:shadow-lg hover:shadow-brand-teal/25
                       hover:scale-[1.02]
                       active:scale-[0.98]
                       transition-all duration-200
                       text-base"
            >
              Continue Conversation
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm md:max-w-md animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icon */}
        <div className="p-6 pb-0 md:p-8 md:pb-0">
          <div className="flex items-start gap-4">
            {/* Save icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-teal/10 to-brand-purple/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                Save Your Progress
              </h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                We'll email you a link to pick up right where you left off.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
          <div>
            <label htmlFor="save-progress-email" className="sr-only">Email address</label>
            <div className="relative">
              <input
                id="save-progress-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="your@email.com"
                autoFocus
                disabled={isSubmitting}
                className={`w-full px-4 py-3.5 pr-11
                         bg-gray-50 rounded-xl border
                         ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-brand-purple focus:ring-brand-purple/20'}
                         focus:bg-white focus:ring-4 focus:outline-none
                         text-gray-900 placeholder:text-gray-400
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-base`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-5 py-3.5
                       bg-gradient-to-r from-brand-teal to-brand-purple
                       text-white font-semibold rounded-xl
                       hover:shadow-lg hover:shadow-brand-teal/25
                       hover:scale-[1.02]
                       active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                       transition-all duration-200
                       flex items-center justify-center gap-2
                       text-base"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  Send Me a Resume Link
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full px-5 py-3
                       text-gray-600 hover:text-gray-900 font-medium rounded-xl
                       hover:bg-gray-50
                       transition-all duration-200
                       text-sm"
            >
              Continue Without Saving
            </button>
          </div>

          {/* Clarification that conversation persists */}
          <p className="text-xs text-gray-400 text-center pt-1">
            Your conversation is still here - you can save anytime.
          </p>
        </form>
      </div>
    </div>
  )
}
