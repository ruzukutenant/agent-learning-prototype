import { useState, useRef, useEffect } from 'react'

interface EarlyExitEmailCardProps {
  onSubmit: (email: string) => Promise<void>
  onSkip: () => void
}

export function EarlyExitEmailCard({ onSubmit, onSkip }: EarlyExitEmailCardProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
      setIsSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="self-start w-full max-w-lg animate-in fade-in duration-300">
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-br from-gray-50/60 to-white rounded-2xl border border-gray-200/80">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-base font-medium text-gray-700">
            Got it. We'll be in touch when you're ready.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="self-start w-full max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-gradient-to-br from-gray-50/60 to-white rounded-2xl overflow-hidden
                      border border-gray-200/80
                      shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_6px_20px_-3px_rgba(0,0,0,0.06)]">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500
                            flex items-center justify-center shadow-lg shadow-gray-400/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">
                No pressure — stay in the loop
              </h4>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Leave your email if you'd like us to follow up with resources when you're ready to revisit.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-5">
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="early-exit-email-input" className="sr-only">Email address</label>
              <input
                ref={inputRef}
                id="early-exit-email-input"
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
                         ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-gray-400 focus:ring-gray-400/20'}
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
                       bg-gray-600 text-white text-base font-semibold rounded-xl
                       hover:bg-gray-500
                       active:bg-gray-700 active:scale-[0.98]
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
                'Stay in Touch'
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
            No thanks
          </button>
        </form>
      </div>
    </div>
  )
}
