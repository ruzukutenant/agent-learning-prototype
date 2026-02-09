import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Session } from '../types'

export function Assessment() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Slider values
  const [clarity, setClarity] = useState(5)
  const [confidence, setConfidence] = useState(5)
  const [capacity, setCapacity] = useState(5)

  // Email
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    api.getSession(sessionId)
      .then(({ session }) => {
        setSession(session)
        setLoading(false)

        // Redirect if no constraint identified yet
        if (!session.constraint_category) {
          navigate(`/chat/${sessionId}`)
        }

        // Redirect if already completed
        if (session.endpoint_selected) {
          navigate(`/summary/${sessionId}`)
        }
      })
      .catch(err => {
        console.error('Failed to load session:', err)
        setLoading(false)
      })
  }, [sessionId, navigate])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleContinue = async () => {
    if (!sessionId || !session) return

    // Save readiness scores first
    try {
      await api.updateSession(sessionId, {
        clarity_score: clarity,
        confidence_score: confidence,
        capacity_score: capacity,
      })

      // Show email modal
      setShowEmailModal(true)
    } catch (err) {
      console.error('Failed to save scores:', err)
    }
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    // Real-time validation
    if (value.trim() && !validateEmail(value)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  const handleEmailSubmit = async () => {
    if (!sessionId || !session) return

    // Validate email
    if (!email.trim()) {
      setEmailError('Please enter your email address')
      return
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError('')

    setSubmitting(true)

    try {
      // Save email
      await api.updateSession(sessionId, {
        user_email: email,
      })

      // Determine endpoint based on scores
      const isHighReadiness = clarity >= 7 && confidence >= 7 && capacity >= 7
      const endpoint = isHighReadiness ? 'EC' : 'EC'

      // Set endpoint and mark complete
      await api.updateSession(sessionId, {
        endpoint_selected: endpoint,
        completion_status: 'completed',
      })

      // Auto-send summary email
      try {
        await api.sendSummaryEmail(sessionId)
        console.log('[Assessment] Summary email sent automatically')
      } catch (emailErr) {
        console.error('[Assessment] Failed to send summary email:', emailErr)
        // Don't block navigation if email fails - they can resend from summary page
      }

      // Navigate to summary
      navigate(`/summary/${sessionId}`)
    } catch (err) {
      console.error('Failed to submit email:', err)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-gray-600">Session not found</div>
      </div>
    )
  }

  const categoryLabels = {
    strategy: 'Offer Clarity Gap',
    execution: 'Execution Bottleneck',
    psychology: 'Inner Block',
  }

  const categoryColors = {
    strategy: 'from-blue-500 to-indigo-600',
    execution: 'from-teal-500 to-green-600',
    psychology: 'from-amber-500 to-orange-600',
  }

  const category = session.constraint_category || 'strategy'

  return (
    <div className="min-h-screen bg-gradient-page py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-teal to-brand-purple rounded-full mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Quick Readiness Check
          </h1>
          <p className="text-lg text-gray-600">
            Now that we've identified your constraint, let's assess where you are with it
          </p>
        </div>

        {/* Brief Constraint Teaser */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${categoryColors[category]} shadow-sm`} />
            <h2 className="text-lg font-semibold text-gray-900">
              Your Core Constraint: {categoryLabels[category]}
            </h2>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            We've identified your primary growth bottleneck. Complete the quick assessment below to unlock your personalized action plan and next steps.
          </p>
        </div>

        {/* Encouraging transition text with carrot */}
        <div className="text-center mb-6 animate-in fade-in duration-500 delay-200">
          <p className="text-gray-700 font-medium text-base mb-1">
            Three quick ratings to unlock your results
          </p>
          <p className="text-sm text-gray-500">
            You'll see your full diagnostic + recommended path forward
          </p>
        </div>

        {/* Assessment Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          {/* Clarity Slider */}
          <div className="pb-4">
            <label className="block text-base md:text-lg font-medium text-gray-900 mb-5">
              How clear are you now about what's going on?
            </label>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={clarity}
                  onChange={(e) => setClarity(Number(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider-purple transition-all"
                  style={{
                    background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${((clarity - 1) / 9) * 100}%, rgb(229, 231, 235) ${((clarity - 1) / 9) * 100}%, rgb(229, 231, 235) 100%)`
                  }}
                />
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-500">Not clear</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                  {clarity}/10
                </span>
                <span className="text-sm text-gray-500">Very clear</span>
              </div>
            </div>
          </div>

          {/* Confidence Slider */}
          <div className="pb-4 border-t border-gray-100 pt-6">
            <label className="block text-base md:text-lg font-medium text-gray-900 mb-5">
              How confident are you that you could address this?
            </label>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider-teal transition-all"
                  style={{
                    background: `linear-gradient(to right, rgb(20, 184, 166) 0%, rgb(20, 184, 166) ${((confidence - 1) / 9) * 100}%, rgb(229, 231, 235) ${((confidence - 1) / 9) * 100}%, rgb(229, 231, 235) 100%)`
                  }}
                />
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-500">Not confident</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-teal-400 bg-clip-text text-transparent">
                  {confidence}/10
                </span>
                <span className="text-sm text-gray-500">Very confident</span>
              </div>
            </div>
          </div>

          {/* Capacity Slider */}
          <div className="pb-2 border-t border-gray-100 pt-6">
            <label className="block text-base md:text-lg font-medium text-gray-900 mb-5">
              How much capacity do you have to work on this right now?
            </label>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer slider-indigo transition-all"
                  style={{
                    background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${((capacity - 1) / 9) * 100}%, rgb(229, 231, 235) ${((capacity - 1) / 9) * 100}%, rgb(229, 231, 235) 100%)`
                  }}
                />
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-500">No capacity</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                  {capacity}/10
                </span>
                <span className="text-sm text-gray-500">Full capacity</span>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="pt-4">
            <button
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-brand-teal to-brand-purple text-white font-semibold py-5 px-8 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-lg"
            >
              See My Personalized Results →
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">
              Your full diagnostic + action plan is ready
            </p>
          </div>
        </div>
      </div>

      {/* Email Collection Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
            {/* Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-teal to-brand-purple rounded-full mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Your Results Are Ready!
              </h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Enter your email to see your personalized diagnostic and get your custom action plan.
              </p>
            </div>

            {/* Benefits List */}
            <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-2xl p-5 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">You'll get instant access to:</p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Your complete growth constraint analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Personalized readiness assessment</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Recommended next steps tailored to your situation</span>
                </li>
              </ul>
            </div>

            {/* Email Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !emailError && handleEmailSubmit()}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:outline-none text-base transition-all ${
                  emailError && email.trim()
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 focus:border-brand-teal focus:ring-brand-teal/20'
                }`}
                autoFocus
              />
              {emailError && email.trim() && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm animate-in fade-in duration-200">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {emailError}
                </div>
              )}
            </div>

            {/* CTA Button */}
            <button
              onClick={handleEmailSubmit}
              disabled={submitting || !!emailError || !email.trim()}
              className="w-full bg-gradient-to-r from-brand-teal to-brand-purple text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg mb-3"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading your results...
                </span>
              ) : (
                'Show Me My Results →'
              )}
            </button>

            {/* Privacy note */}
            <p className="text-xs text-center text-gray-500">
              We'll email you a copy of your results. No spam, ever.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
