import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trophy, Square, BarChart3, FlaskConical, CheckCircle2, Clock, Globe, MessageSquare, FileCheck, Mail, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'

// --- Types ---

interface VariantResult {
  variant: string
  views: number
  conversions: number
  conversionRate: number
}

interface TestResult {
  testName: string
  variants: VariantResult[]
  totalViews: number
}

interface VariantConfig {
  key: string
  headline: string
  subheadline: string
  cta?: string
  description?: string
  button_text?: string
}

interface TestConfig {
  id: string
  test_name: string
  location: string
  variants: VariantConfig[]
  active: boolean
  winner: string | null
  created_at: string
  ended_at: string | null
}

// --- Statistical significance (two-proportion z-test) ---

function calcSignificance(
  viewsA: number, convsA: number,
  viewsB: number, convsB: number,
): { zScore: number; pValue: number; significant: boolean; confidence: number; lift: number } {
  if (viewsA === 0 || viewsB === 0) return { zScore: 0, pValue: 1, significant: false, confidence: 0, lift: 0 }

  const pA = convsA / viewsA
  const pB = convsB / viewsB
  const pPool = (convsA + convsB) / (viewsA + viewsB)

  if (pPool === 0 || pPool === 1) return { zScore: 0, pValue: 1, significant: false, confidence: 0, lift: 0 }

  const se = Math.sqrt(pPool * (1 - pPool) * (1 / viewsA + 1 / viewsB))
  if (se === 0) return { zScore: 0, pValue: 1, significant: false, confidence: 0, lift: 0 }

  const z = (pB - pA) / se
  const pValue = 2 * (1 - normalCDF(Math.abs(z)))
  const confidence = (1 - pValue) * 100
  const lift = pA > 0 ? ((pB - pA) / pA) * 100 : 0

  return { zScore: z, pValue, significant: pValue < 0.05, confidence: Math.min(confidence, 99.9), lift }
}

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.SQRT2
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1.0 + sign * y)
}

// --- Location metadata (shared) ---

const LOCATION_LABELS: Record<string, string> = {
  landing: 'Landing Page',
  'component:email_capture': 'Email Capture (Mid-Chat)',
  'component:handoff_card': 'Summary Card (End of Chat)',
  'component:eoc_email': 'End-of-Chat Email',
}

function LocationIcon({ location, className }: { location: string; className?: string }) {
  if (location === 'landing') return <Globe className={className} />
  if (location === 'component:email_capture') return <MessageSquare className={className} />
  if (location === 'component:eoc_email') return <Mail className={className} />
  return <FileCheck className={className} />
}

// --- Main component ---

export default function SplitTests() {
  const navigate = useNavigate()
  const [password, setPassword] = useState(() => localStorage.getItem('admin_password') || '')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [testConfigs, setTestConfigs] = useState<TestConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // End test confirmation
  const [endingTestId, setEndingTestId] = useState<string | null>(null)
  const [endAction, setEndAction] = useState<'winner' | 'stop' | null>(null)
  const [selectedWinner, setSelectedWinner] = useState<string>('A')

  // Collapsible sections
  const [showPastTests, setShowPastTests] = useState(false)
  const [showLegacy, setShowLegacy] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('admin_password')
    if (saved) { setPassword(saved); setIsAuthenticated(true) }
  }, [])

  useEffect(() => { if (isAuthenticated) loadResults() }, [isAuthenticated])

  const handleLogin = async () => {
    try {
      await api.adminLogin(password)
      localStorage.setItem('admin_password', password)
      setIsAuthenticated(true)
    } catch { setError('Invalid password') }
  }

  const loadResults = async () => {
    setIsLoading(true)
    try {
      const data = await api.getSplitTestResults(password)
      setResults(data.tests)
      setTestConfigs(data.testConfigs || [])
    } catch (err) { console.error('Error loading split test results:', err) }
    finally { setIsLoading(false) }
  }

  const handleEndTest = async () => {
    if (!endingTestId) return
    try {
      const winner = endAction === 'winner' ? selectedWinner : undefined
      await api.endSplitTest(password, endingTestId, winner)
      setEndingTestId(null)
      setEndAction(null)
      await loadResults()
    } catch (err) { console.error('Error ending test:', err) }
  }

  const getResultsForTest = (testName: string) => results.find(r => r.testName === testName)

  // --- Login ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h1>
          <form onSubmit={e => { e.preventDefault(); handleLogin() }} className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-full border border-gray-200 focus:ring-2 focus:ring-brand-teal/30 focus:border-brand-teal outline-none" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full px-4 py-3 bg-brand-teal text-white rounded-full font-medium hover:opacity-90 transition-opacity">Login</button>
          </form>
        </div>
      </div>
    )
  }

  // Separate tests by status and type
  const activeTests = testConfigs.filter(t => t.active)
  const activeLandingTests = activeTests.filter(t => t.location === 'landing')
  const activeComponentTests = activeTests.filter(t => t.location !== 'landing')
  const endedTests = testConfigs.filter(t => !t.active)
  const legacyResults = results.filter(r => !testConfigs.some(tc => tc.test_name === r.testName))

  return (
    <div className="min-h-screen bg-gradient-page py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* ========== HEADER ========== */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">A/B Tests</h1>
            <p className="text-sm text-gray-500">Compare copy variations across the landing page and in-app components</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                       bg-white border border-gray-200 rounded-lg
                       hover:bg-gray-50 hover:border-gray-300
                       transition-all duration-150">
              <ArrowLeft className="w-4 h-4" />
              Admin
            </button>
            <button onClick={() => navigate('/admin/split-tests/new')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                       bg-brand-teal rounded-lg hover:opacity-90
                       transition-all duration-150 shadow-sm">
              <Plus className="w-4 h-4" /> New Test
            </button>
          </div>
        </div>

        {/* ========== END TEST CONFIRMATION MODAL ========== */}
        {endingTestId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">End This Test</h2>
                <p className="text-sm text-gray-500">Choose what happens next</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <button onClick={() => setEndAction('winner')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    endAction === 'winner' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="flex items-center gap-3">
                    <Trophy className={`w-5 h-5 ${endAction === 'winner' ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-900">Pick a winner</p>
                      <p className="text-sm text-gray-500">All visitors will see the winning variant going forward</p>
                    </div>
                  </div>
                  {endAction === 'winner' && (
                    <div className="mt-3 ml-8 flex gap-2">
                      {testConfigs.find(t => t.id === endingTestId)?.variants.map(v => (
                        <button key={v.key} onClick={(e) => { e.stopPropagation(); setSelectedWinner(v.key) }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedWinner === v.key
                              ? 'bg-amber-400 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          Variant {v.key}
                        </button>
                      ))}
                    </div>
                  )}
                </button>

                <button onClick={() => setEndAction('stop')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    endAction === 'stop' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="flex items-center gap-3">
                    <Square className={`w-5 h-5 ${endAction === 'stop' ? 'text-gray-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-gray-900">Just stop the test</p>
                      <p className="text-sm text-gray-500">Reverts to default copy (no winner selected)</p>
                    </div>
                  </div>
                </button>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                <button onClick={() => { setEndingTestId(null); setEndAction(null) }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={handleEndTest} disabled={!endAction}
                  className="px-5 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-40 transition-all shadow-sm">
                  {endAction === 'winner' ? `End Test — Variant ${selectedWinner} Wins` : 'End Test'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== LOADING STATE ========== */}
        {isLoading ? (
          <div className="text-gray-500 text-center py-16">Loading...</div>
        ) : (
          <div className="space-y-8">

            {/* ========== ACTIVE LANDING PAGE TESTS ========== */}
            {activeLandingTests.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Landing Page</h2>
                  <span className="text-xs text-gray-400 font-normal normal-case tracking-normal">— optimizing visitor conversion</span>
                </div>

                <div className="space-y-4">
                  {activeLandingTests.map(test => {
                    const testResults = getResultsForTest(test.test_name)
                    const variantA = testResults?.variants.find(v => v.variant === 'A')
                    const variantB = testResults?.variants.find(v => v.variant === 'B')
                    const sig = variantA && variantB
                      ? calcSignificance(variantA.views, variantA.conversions, variantB.views, variantB.conversions)
                      : null
                    const totalViews = testResults?.totalViews || 0
                    const locationLabel = LOCATION_LABELS[test.location] || test.location

                    return (
                      <div key={test.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Test header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                              <LocationIcon location={test.location} className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-900">{test.test_name}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Since {new Date(test.created_at).toLocaleDateString()}
                                </span>
                                <span className="text-gray-200">·</span>
                                <span className="text-xs font-medium text-gray-500">{locationLabel}</span>
                                <span className="text-gray-200">·</span>
                                <span className="text-xs text-gray-400">
                                  {totalViews} {test.location === 'landing' ? 'visitors' : 'impressions'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => { setEndingTestId(test.id); setEndAction(null); setSelectedWinner('A') }}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                            End Test
                          </button>
                        </div>

                        {/* Results body */}
                        {testResults && testResults.totalViews > 0 ? (
                          <div className="px-6 py-5 space-y-5">
                            {/* Variant comparison cards */}
                            <div className="grid grid-cols-2 gap-4">
                              {testResults.variants.map(v => {
                                const varConfig = test.variants.find(vc => vc.key === v.variant)
                                const isLeading = testResults.variants.length === 2 &&
                                  v.conversionRate === Math.max(...testResults.variants.map(x => x.conversionRate)) &&
                                  v.conversionRate > 0
                                return (
                                  <div key={v.variant} className={`rounded-xl border-2 p-4 ${
                                    isLeading ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'
                                  }`}>
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-bold text-gray-700">Variant {v.variant}</span>
                                      {isLeading && (
                                        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          Leading
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">
                                      {(v.conversionRate * 100).toFixed(1)}%
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      {v.conversions} conversions / {v.views} {test.location === 'landing' ? 'visitors' : 'impressions'}
                                    </p>
                                    {varConfig && (
                                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                                        <p className="text-xs text-gray-500 truncate" title={varConfig.headline}>
                                          <span className="font-medium text-gray-600">Headline:</span>{' '}
                                          {varConfig.headline.replace(/<[^>]*>/g, '').slice(0, 60)}
                                        </p>
                                        {varConfig.cta && (
                                          <p className="text-xs text-gray-500">
                                            <span className="font-medium text-gray-600">CTA:</span> {varConfig.cta}
                                          </p>
                                        )}
                                        {varConfig.description && (
                                          <p className="text-xs text-gray-500 truncate" title={varConfig.description}>
                                            <span className="font-medium text-gray-600">Description:</span>{' '}
                                            {varConfig.description.slice(0, 60)}
                                          </p>
                                        )}
                                        {varConfig.button_text && (
                                          <p className="text-xs text-gray-500">
                                            <span className="font-medium text-gray-600">Button:</span> {varConfig.button_text}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Statistical significance */}
                            {sig && (
                              <div className={`rounded-xl p-4 ${
                                sig.significant
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-gray-50 border border-gray-200'
                              }`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <BarChart3 className={`w-4 h-4 ${sig.significant ? 'text-green-600' : 'text-gray-400'}`} />
                                  <span className={`text-sm font-semibold ${sig.significant ? 'text-green-700' : 'text-gray-600'}`}>
                                    Statistical Significance
                                  </span>
                                </div>

                                {totalViews < 100 ? (
                                  <p className="text-sm text-gray-500">
                                    Need more data — at least 100 {test.location === 'landing' ? 'visitors' : 'impressions'} recommended.
                                    Currently at {totalViews}.
                                  </p>
                                ) : sig.significant ? (
                                  <div className="space-y-1">
                                    <p className="text-sm text-green-700">
                                      <span className="font-bold">{sig.confidence.toFixed(1)}% confidence</span> that Variant B is{' '}
                                      {sig.lift > 0 ? 'better' : 'worse'} than Variant A
                                    </p>
                                    <p className="text-sm text-green-600">
                                      Lift: <span className="font-semibold">{sig.lift > 0 ? '+' : ''}{sig.lift.toFixed(1)}%</span>
                                      {' '}· You can confidently pick a winner.
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">
                                    <span className="font-medium">{sig.confidence.toFixed(1)}% confidence</span> — not yet significant.
                                    Keep the test running. Typically need 95%+ confidence.
                                  </p>
                                )}

                                {/* Progress bar */}
                                <div className="mt-3">
                                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                                    <span>0%</span>
                                    <span className="text-gray-500 font-medium">{sig.confidence.toFixed(0)}% confidence</span>
                                    <span>95% threshold</span>
                                  </div>
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        sig.significant ? 'bg-green-400' : 'bg-amber-400'
                                      }`}
                                      style={{ width: `${Math.min(100, (sig.confidence / 95) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-6 py-8 text-center">
                            <FlaskConical className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Waiting for data — results will appear once people start seeing this test.</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ========== ACTIVE COMPONENT TESTS ========== */}
            {activeComponentTests.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">In-App Components</h2>
                  <span className="text-xs text-gray-400 font-normal normal-case tracking-normal">— optimizing email capture and engagement</span>
                </div>

                <div className="space-y-4">
                  {activeComponentTests.map(test => {
                    const testResults = getResultsForTest(test.test_name)
                    const variantA = testResults?.variants.find(v => v.variant === 'A')
                    const variantB = testResults?.variants.find(v => v.variant === 'B')
                    const sig = variantA && variantB
                      ? calcSignificance(variantA.views, variantA.conversions, variantB.views, variantB.conversions)
                      : null
                    const totalViews = testResults?.totalViews || 0
                    const locationLabel = LOCATION_LABELS[test.location] || test.location

                    return (
                      <div key={test.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                              <LocationIcon location={test.location} className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-900">{test.test_name}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Since {new Date(test.created_at).toLocaleDateString()}
                                </span>
                                <span className="text-gray-200">·</span>
                                <span className="text-xs font-medium text-gray-500">{locationLabel}</span>
                                <span className="text-gray-200">·</span>
                                <span className="text-xs text-gray-400">{totalViews} impressions</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => { setEndingTestId(test.id); setEndAction(null); setSelectedWinner('A') }}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                            End Test
                          </button>
                        </div>

                        {testResults && testResults.totalViews > 0 ? (
                          <div className="px-6 py-5 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                              {testResults.variants.map(v => {
                                const varConfig = test.variants.find(vc => vc.key === v.variant)
                                const isLeading = testResults.variants.length === 2 &&
                                  v.conversionRate === Math.max(...testResults.variants.map(x => x.conversionRate)) &&
                                  v.conversionRate > 0
                                return (
                                  <div key={v.variant} className={`rounded-xl border-2 p-4 ${
                                    isLeading ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'
                                  }`}>
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-bold text-gray-700">Variant {v.variant}</span>
                                      {isLeading && (
                                        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          Leading
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1">
                                      {(v.conversionRate * 100).toFixed(1)}%
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      {v.conversions} conversions / {v.views} impressions
                                    </p>
                                    {varConfig && (
                                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                                        <p className="text-xs text-gray-500 truncate" title={varConfig.headline}>
                                          <span className="font-medium text-gray-600">Headline:</span>{' '}
                                          {varConfig.headline.replace(/<[^>]*>/g, '').slice(0, 60)}
                                        </p>
                                        {varConfig.description && (
                                          <p className="text-xs text-gray-500 truncate" title={varConfig.description}>
                                            <span className="font-medium text-gray-600">Description:</span>{' '}
                                            {varConfig.description.slice(0, 60)}
                                          </p>
                                        )}
                                        {varConfig.button_text && (
                                          <p className="text-xs text-gray-500">
                                            <span className="font-medium text-gray-600">Button:</span> {varConfig.button_text}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {sig && (
                              <div className={`rounded-xl p-4 ${
                                sig.significant
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-gray-50 border border-gray-200'
                              }`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <BarChart3 className={`w-4 h-4 ${sig.significant ? 'text-green-600' : 'text-gray-400'}`} />
                                  <span className={`text-sm font-semibold ${sig.significant ? 'text-green-700' : 'text-gray-600'}`}>
                                    Statistical Significance
                                  </span>
                                </div>
                                {totalViews < 100 ? (
                                  <p className="text-sm text-gray-500">
                                    Need more data — at least 100 impressions recommended. Currently at {totalViews}.
                                  </p>
                                ) : sig.significant ? (
                                  <div className="space-y-1">
                                    <p className="text-sm text-green-700">
                                      <span className="font-bold">{sig.confidence.toFixed(1)}% confidence</span> that Variant B is{' '}
                                      {sig.lift > 0 ? 'better' : 'worse'} than Variant A
                                    </p>
                                    <p className="text-sm text-green-600">
                                      Lift: <span className="font-semibold">{sig.lift > 0 ? '+' : ''}{sig.lift.toFixed(1)}%</span>
                                      {' '}· You can confidently pick a winner.
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">
                                    <span className="font-medium">{sig.confidence.toFixed(1)}% confidence</span> — not yet significant.
                                    Keep the test running. Typically need 95%+ confidence.
                                  </p>
                                )}
                                <div className="mt-3">
                                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                                    <span>0%</span>
                                    <span className="text-gray-500 font-medium">{sig.confidence.toFixed(0)}% confidence</span>
                                    <span>95% threshold</span>
                                  </div>
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        sig.significant ? 'bg-green-400' : 'bg-amber-400'
                                      }`}
                                      style={{ width: `${Math.min(100, (sig.confidence / 95) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-6 py-8 text-center">
                            <FlaskConical className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Waiting for data — results will appear once people start seeing this component.</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ========== NO ACTIVE TESTS ========== */}
            {activeTests.length === 0 && testConfigs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <FlaskConical className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active tests. Create a new test to start optimizing.</p>
              </div>
            )}

            {/* ========== PAST TESTS (collapsible) ========== */}
            {endedTests.length > 0 && (
              <section>
                <button
                  onClick={() => setShowPastTests(!showPastTests)}
                  className="flex items-center gap-2 mb-4 group"
                >
                  {showPastTests ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">
                    Past Tests
                  </h2>
                  <span className="text-xs text-gray-400 font-normal normal-case tracking-normal">({endedTests.length})</span>
                </button>

                {showPastTests && (
                  <div className="space-y-3">
                    {endedTests.map(test => {
                      const testResults = getResultsForTest(test.test_name)
                      const locationLabel = LOCATION_LABELS[test.location] || test.location
                      return (
                        <div key={test.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                <LocationIcon location={test.location} className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-gray-700">{test.test_name}</h3>
                                  {test.winner ? (
                                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                      <Trophy className="w-3 h-3" /> Winner: Variant {test.winner}
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Stopped</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">
                                    {new Date(test.created_at).toLocaleDateString()} — {test.ended_at ? new Date(test.ended_at).toLocaleDateString() : 'ended'}
                                  </span>
                                  <span className="text-gray-200">·</span>
                                  <span className="text-xs text-gray-400">{locationLabel}</span>
                                </div>
                              </div>
                            </div>
                            {testResults && (
                              <div className="flex gap-6">
                                {testResults.variants.map(v => (
                                  <div key={v.variant} className="text-center">
                                    <p className="text-xs text-gray-400">Variant {v.variant}</p>
                                    <p className={`text-sm font-bold ${test.winner === v.variant ? 'text-amber-600' : 'text-gray-600'}`}>
                                      {(v.conversionRate * 100).toFixed(1)}%
                                    </p>
                                    <p className="text-[10px] text-gray-400">{v.views} views</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ========== LEGACY RESULTS (collapsible) ========== */}
            {legacyResults.length > 0 && (
              <section>
                <button
                  onClick={() => setShowLegacy(!showLegacy)}
                  className="flex items-center gap-2 mb-4 group"
                >
                  {showLegacy ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">
                    Legacy Tests
                  </h2>
                  <span className="text-xs text-gray-400 font-normal normal-case tracking-normal">({legacyResults.length})</span>
                </button>

                {showLegacy && (
                  <div className="space-y-3">
                    {legacyResults.map(test => (
                      <div key={test.testName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                          <h3 className="font-medium text-gray-700">{test.testName}</h3>
                          <span className="text-xs text-gray-400">{test.totalViews} total views</span>
                        </div>
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                              <th className="px-5 py-2 font-medium">Variant</th>
                              <th className="px-5 py-2 font-medium">Views</th>
                              <th className="px-5 py-2 font-medium">Conversions</th>
                              <th className="px-5 py-2 font-medium">Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {test.variants.map(v => (
                              <tr key={v.variant} className="border-b border-gray-50 last:border-0">
                                <td className="px-5 py-3 text-sm font-medium text-gray-900">Variant {v.variant}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{v.views}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{v.conversions}</td>
                                <td className="px-5 py-3 text-sm font-semibold text-gray-600">{(v.conversionRate * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ========== EMPTY STATE ========== */}
            {testConfigs.length === 0 && legacyResults.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-700 mb-2">No A/B tests yet</h2>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                  Create your first test to compare different copy on your landing page or in-app components like the email capture and summary cards.
                </p>
                <button onClick={() => navigate('/admin/split-tests/new')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-teal text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-sm">
                  <Plus className="w-4 h-4" /> Create Your First Test
                </button>
              </div>
            )}

            {/* ========== HOW IT WORKS ========== */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                How A/B Testing Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { step: '1', title: 'Create a test', desc: 'Pick a location (landing page or in-app component) and write two variants of the copy.' },
                  { step: '2', title: 'Traffic is split automatically', desc: 'Visitors are randomly assigned to Variant A or B using a 50/50 split.' },
                  { step: '3', title: 'Monitor results', desc: 'View conversion rates and statistical significance in real-time as data comes in.' },
                  { step: '4', title: 'Pick a winner', desc: 'When you have enough data (95%+ confidence), choose the winning variant or stop the test.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Tip: Add <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">?variant=B</code> to any URL to preview Variant B without affecting data.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
