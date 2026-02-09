import { useState } from 'react'

interface EmailCollectorProps {
  onSubmit: (email: string) => void
  submitted?: boolean
  submittedEmail?: string
}

export function EmailCollector({ onSubmit, submitted = false, submittedEmail = '' }: EmailCollectorProps) {
  const [email, setEmail] = useState(submittedEmail || '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    onSubmit(email)
  }

  return (
    <div className="max-w-[85%] md:max-w-[75%] lg:max-w-2xl self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Content Card with refined depth and hierarchy */}
      {/* Pattern: Subtle gradient card - bg-gradient-to-br from-[color-50/70] to-white */}
      <div className={`backdrop-blur-md rounded-3xl p-7 md:p-9 border
        shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_6px_20px_-3px_rgba(0,0,0,0.06)]
        ${submitted
          ? 'border-green-200/80 bg-gradient-to-br from-green-50/70 to-white'
          : 'border-gray-200/60 bg-gradient-to-br from-gray-100/70 to-white hover:border-gray-300/70 hover:shadow-[0_4px_16px_-3px_rgba(0,0,0,0.1),0_8px_24px_-4px_rgba(0,0,0,0.08)]'
        }
        transition-all duration-300`}>
        {/* Headline with refined spacing */}
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
            Get Your Personalized Summary
          </h3>
          {submitted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-green-50 to-green-100/80 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap border border-green-200/50 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Submitted
            </span>
          )}
        </div>

        {/* Description with improved readability */}
        <p className="text-gray-600 leading-relaxed mb-7 text-base md:text-lg tracking-wide">
          I'll send you a detailed summary of what we discovered, your readiness scores, and personalized next steps to move forward.
        </p>

        {/* Email input form with refined styling */}
        <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            placeholder="your@email.com"
            autoFocus={!submitted}
            disabled={isSubmitting || submitted}
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
          {!error && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400/70 transition-colors duration-200 peer-focus:text-brand-purple">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 px-1 animate-in fade-in slide-in-from-top-1 duration-200 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {!submitted && (
          <>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group w-full px-6 py-4 relative overflow-hidden
                       bg-gradient-to-r from-brand-teal via-[#0ea4a4] to-brand-purple
                       text-white font-semibold rounded-2xl
                       hover:shadow-[0_8px_24px_-4px_rgba(13,148,136,0.35),0_4px_16px_-2px_rgba(139,92,246,0.25)]
                       hover:scale-[1.02] hover:brightness-110
                       active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:brightness-100
                       transition-all duration-200
                       flex items-center justify-center gap-2.5
                       text-base md:text-lg tracking-wide
                       shadow-[0_4px_14px_-2px_rgba(13,148,136,0.25),0_2px_8px_-1px_rgba(139,92,246,0.15)]
                       before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0
                       before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="relative z-10">Sending...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Send My Summary</span>
                  <svg className="w-5 h-5 relative z-10 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            {/* Trust element / privacy note with refined styling */}
            <p className="text-xs text-gray-500/90 text-center mt-5 flex items-center justify-center gap-2 tracking-wide">
              <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Your email is safe. We respect your privacy.
            </p>
          </>
        )}
      </form>
      </div>
    </div>
  )
}
