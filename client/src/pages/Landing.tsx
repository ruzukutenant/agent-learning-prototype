import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ValuePropIcon } from '../components/ui/ValuePropIcon'
import { sessionStorage } from '../lib/sessionStorage'
import { api } from '../lib/api'
import { trackLandingView } from '../lib/analytics'
import { trackMetaEvent } from '../lib/meta-pixel'
import { ExitIntentPopup } from '../components/ui/ExitIntentPopup'
import { getVariant, fetchActiveTests, type ActiveSplitTest } from '../lib/splitTest'

export default function Landing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Initialize from localStorage immediately (no lag)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(() => sessionStorage.get())
  const [savedUserName, setSavedUserName] = useState<string | null>(null)

  // Split test: headline variants (only active when a test is configured)
  const [activeTest, setActiveTest] = useState<ActiveSplitTest | null>(null)
  const [headlineVariant, setHeadlineVariant] = useState<string | null>(null)
  const [testsLoaded, setTestsLoaded] = useState(false)

  useEffect(() => {
    fetchActiveTests().then(tests => {
      const landingTest = tests.find(t => t.location === 'landing')
      if (landingTest) {
        setActiveTest(landingTest)
        const variantKeys = landingTest.variants.map(v => v.key)
        // If test has a winner, always show winner
        const assigned = landingTest.winner || getVariant(landingTest.test_name, variantKeys)
        setHeadlineVariant(assigned)
      }
      setTestsLoaded(true)
    })
  }, [])

  // Prevent duplicate tracking (React StrictMode runs effects twice)
  const hasTracked = useRef(false)
  const hasVerifiedSession = useRef(false)

  // Effect 1: Track landing page view (waits for tests to load)
  useEffect(() => {
    if (!testsLoaded || hasTracked.current) return
    hasTracked.current = true

    const VISITOR_KEY = 'cma_unique_visitor'
    const isNewVisitor = !localStorage.getItem(VISITOR_KEY)

    if (isNewVisitor) {
      // First time visitor - track and mark as visited
      localStorage.setItem(VISITOR_KEY, new Date().toISOString())
      // Only include split test data if an active test is running
      const eventData = activeTest
        ? { splitTest: activeTest.test_name, variant: headlineVariant }
        : undefined
      trackLandingView(eventData)
    }

    // Meta Pixel PageView fires for all visitors (Meta handles dedup)
    trackMetaEvent('PageView')
  }, [testsLoaded, activeTest, headlineVariant])

  // Effect 2: Verify saved session (runs once on mount)
  useEffect(() => {
    if (hasVerifiedSession.current) return
    hasVerifiedSession.current = true

    const verifySavedSession = async () => {
      const sessionId = sessionStorage.get()
      if (sessionId) {
        try {
          const { session } = await api.getSession(sessionId)
          if (!session || session.constraint_category) {
            sessionStorage.clear()
            setSavedSessionId(null)
            setSavedUserName(null)
          } else {
            setSavedUserName(session.user_name || null)
          }
        } catch {
          sessionStorage.clear()
          setSavedSessionId(null)
          setSavedUserName(null)
        }
      }
    }

    verifySavedSession()
  }, [])

  // Effect 3: Handle referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      localStorage.setItem('cma_ref_code', refCode.toUpperCase())
    }
  }, [searchParams])

  const handleResumeSession = () => {
    if (savedSessionId) {
      navigate(`/chat/${savedSessionId}`)
    }
  }

  const handleStartNew = () => {
    // Clear any existing session before starting new
    sessionStorage.clear()
    navigate('/interview')
  }

  return (
    <div className="min-h-screen bg-gradient-page flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <Badge className="mb-8">Free • 15-30 minutes</Badge>

          {/* Headline - shows test variant if active, otherwise default */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight tracking-tight"
              dangerouslySetInnerHTML={{
                __html: activeTest && headlineVariant
                  ? (activeTest.variants.find(v => v.key === headlineVariant)?.headline
                    || activeTest.variants[0].headline)
                  : 'Discover What\'s <em class="italic">Really</em><br />Holding Your Business Back'
              }}
          />

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
             dangerouslySetInnerHTML={{
               __html: activeTest && headlineVariant
                 ? (activeTest.variants.find(v => v.key === headlineVariant)?.subheadline
                   || activeTest.variants[0].subheadline || '')
                 : 'It\'s usually not what you think. Through a guided conversation, you\'ll discover the <em>one</em> constraint blocking your growth—and build clarity you can actually act on.'
             }}
          />

          {/* Value Props - Phase 7: Emphasize learning */}
          <div className="flex items-center justify-center gap-8 md:gap-12 mb-10">
            <ValuePropIcon icon="assessment" label="Guided discovery" />
            <ValuePropIcon icon="clarity" label="Build real clarity" />
            <ValuePropIcon icon="action" label="Know your next step" />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-3">
              {savedSessionId ? (
                <>
                  <p className="text-base text-gray-700 mb-1">
                    Welcome back{savedUserName ? `, ${savedUserName}` : ''}! You have a conversation in progress.
                  </p>
                  <Button
                    size="lg"
                    onClick={handleResumeSession}
                  >
                    Continue Conversation
                  </Button>
                  <button
                    onClick={handleStartNew}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-4"
                  >
                    Start a new assessment instead
                  </button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={handleStartNew}
                >
                  {activeTest
                    ? (activeTest.variants.find(v => v.key === headlineVariant)?.cta || 'Find My Next Step')
                    : 'Find My Next Step'}
                </Button>
              )}
            </div>
        </div>
      </main>

      {/* Exit Intent Popup */}
      <ExitIntentPopup variant="landing" onStartAssessment={handleStartNew} />

      {/* Footer */}
      <footer className="py-6 px-6">
        <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
          <p>Your responses are private and never shared.</p>
          <div className="flex items-center gap-6">
            <span>Powered by <a href="https://mirasee.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">Mirasee</a></span>
            <span className="text-gray-300">|</span>
            <a href="https://mirasee.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
            <a href="https://mirasee.com/terms-conditions/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
