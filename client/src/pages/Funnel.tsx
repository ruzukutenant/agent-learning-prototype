import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, TrendingUp, Calendar, Mail } from 'lucide-react'
import { FunnelChart } from '../components/analytics/FunnelChart'
import { MetricsCard } from '../components/analytics/MetricsCard'

interface FunnelStage {
  name: string
  count: number
  percentage: number
  dropOff: number
}

interface FunnelMetrics {
  total: {
    landingViews: number
    sessionsStarted: number
    chatsStarted: number
    chatsCompleted: number
    emailsProvided: number
    summariesViewed: number
    bookingsClicked: number
    callsBooked: number
  }
  conversionRates: {
    landingToSession: number
    sessionToChat: number
    chatToCompletion: number
    completionToSummary: number
    summaryToBookingClick: number
    bookingClickToBooked: number
    overallConversion: number
  }
  dropOffAnalysis: {
    abandonedAtNameCollection: number
    abandonedAfterFirstMessage: number
    abandonedBeforeCompletion: number
    abandonedAtSummary: number
    clickedButDidntBook: number
  }
  endpointPerformance: {
    EC: { clicks: number; bookings: number; conversionRate: number }
    MIST: { clicks: number; bookings: number; conversionRate: number }
  }
  emailCaptureRate: number
  emailCaptureRateOfStarted: number
  avgTimeToComplete?: number
  avgTimeToBook?: number
  constraintBreakdown: {
    strategy: number
    execution: number
    psychology: number
  }
  engagement: {
    medianTurns: number
    medianTimeMinutes: number
    completedCount: number
  }
  trends?: {
    overallConversion: number
    bookings: number
    emailCapture: number
  }
}

type DateRange = 'all' | '7d' | '30d' | '90d' | 'custom'
type EndpointFilter = 'all' | 'ec' | 'mist'

const dateRangeLabels: Record<DateRange, string> = {
  all: 'All Time',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  custom: 'Custom',
}

function getDefaultCustomDates() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 7)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

const endpointLabels: Record<EndpointFilter, string> = {
  all: 'All Endpoints',
  ec: 'Strategy Call',
  mist: 'Implementation Call',
}

// Constraint breakdown mini-component with percentages
function ConstraintCards({ breakdown }: { breakdown: { strategy: number; execution: number; psychology: number } }) {
  const total = breakdown.strategy + breakdown.execution + breakdown.psychology
  const getPercent = (count: number) => total > 0 ? Math.round((count / total) * 100) : 0

  const constraints = [
    {
      label: 'Strategy',
      count: breakdown.strategy,
      percent: getPercent(breakdown.strategy),
      bg: 'bg-violet-50/80',
      border: 'border-violet-200/60',
      text: 'text-violet-600',
      muted: 'text-violet-400',
    },
    {
      label: 'Execution',
      count: breakdown.execution,
      percent: getPercent(breakdown.execution),
      bg: 'bg-orange-50/80',
      border: 'border-orange-200/60',
      text: 'text-orange-600',
      muted: 'text-orange-400',
    },
    {
      label: 'Psychology',
      count: breakdown.psychology,
      percent: getPercent(breakdown.psychology),
      bg: 'bg-teal-50/80',
      border: 'border-teal-200/60',
      text: 'text-teal-600',
      muted: 'text-teal-400',
    },
  ]

  return (
    <div className="flex gap-3">
      {constraints.map((c) => (
        <div key={c.label} className={`flex-1 ${c.bg} rounded-lg p-3 border ${c.border}`}>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-semibold ${c.text} tabular-nums`}>
              {c.percent}%
            </span>
            <span className={`text-xs ${c.muted}`}>{c.count}</span>
          </div>
          <div className={`text-xs font-medium ${c.text} mt-1`}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function Funnel() {
  const navigate = useNavigate()
  const [adminPassword, setAdminPassword] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [showLogin, setShowLogin] = useState<boolean>(false)

  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([])
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [endpointFilter, setEndpointFilter] = useState<EndpointFilter>('all')
  const [loading, setLoading] = useState(true)

  // Check authentication
  useEffect(() => {
    const savedPassword = localStorage.getItem('adminPassword')
    if (savedPassword) {
      setAdminPassword(savedPassword)
      setIsAuthenticated(true)
    } else {
      setShowLogin(true)
      setLoading(false)
    }
  }, [])

  // Fetch data when authenticated or filters change
  // Debounce custom date changes so the date picker doesn't reset mid-interaction
  const customDateTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (!isAuthenticated) return
    if (dateRange === 'custom') {
      if (!customStart || !customEnd || customStart > customEnd) return
      clearTimeout(customDateTimer.current)
      customDateTimer.current = setTimeout(() => fetchFunnelData(), 600)
      return () => clearTimeout(customDateTimer.current)
    }
    fetchFunnelData()
  }, [isAuthenticated, dateRange, endpointFilter, customStart, customEnd])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })

      if (response.ok) {
        localStorage.setItem('adminPassword', adminPassword)
        setIsAuthenticated(true)
        setShowLogin(false)
      } else {
        alert('Invalid password')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminPassword')
    setIsAuthenticated(false)
    setAdminPassword('')
    navigate('/admin')
  }

  const fetchFunnelData = async () => {
    if (!metrics) setLoading(true)
    try {
      const params = new URLSearchParams()

      // Add date params
      if (dateRange === 'custom') {
        if (!customStart || !customEnd || customStart > customEnd) return
        params.set('startDate', new Date(customStart + 'T00:00:00').toISOString())
        params.set('endDate', new Date(customEnd + 'T23:59:59').toISOString())
      } else if (dateRange !== 'all') {
        const end = new Date()
        const start = new Date()
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
        start.setDate(end.getDate() - days)
        params.set('startDate', start.toISOString())
        params.set('endDate', end.toISOString())
      }

      // Add endpoint filter
      if (endpointFilter !== 'all') {
        params.set('endpoint', endpointFilter)
      }

      const queryString = params.toString() ? `?${params.toString()}` : ''

      // Single combined fetch for both metrics and funnel stages
      const response = await fetch(
        `${API_BASE}/api/analytics/combined${queryString}`
      )
      const data = await response.json()
      setFunnelStages(data.funnel)
      setMetrics(data.metrics)
    } catch (error) {
      console.error('Error fetching funnel data:', error)
    } finally {
      setLoading(false)
    }
  }

  
  // Login Screen
  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-page px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Funnel Analytics
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg
                         focus:ring-2 focus:ring-violet-500 focus:border-transparent
                         transition-all duration-200"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-500
                       text-white font-medium rounded-lg
                       transition-colors duration-200"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full px-6 py-3 text-gray-600 hover:text-gray-900
                       transition-colors duration-200"
            >
              Back to Admin Dashboard
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-page">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
        </div>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-page py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Funnel Analytics
            </h1>
            <p className="text-sm text-gray-500">
              Track conversion performance from landing to booking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                       bg-white border border-gray-200 rounded-lg
                       hover:bg-gray-50 hover:border-gray-300
                       transition-all duration-150"
            >
              <ArrowLeft className="w-4 h-4" />
              Admin
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500
                       rounded-lg hover:text-red-600 hover:bg-red-50
                       transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex bg-white rounded-lg border border-gray-200 p-1">
              {(['all', '7d', '30d', '90d', 'custom'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    if (range === 'custom' && !customStart) {
                      const defaults = getDefaultCustomDates()
                      setCustomStart(defaults.start)
                      setCustomEnd(defaults.end)
                    }
                    setDateRange(range)
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                    dateRange === range
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {dateRangeLabels[range]}
                </button>
              ))}
            </div>
            {dateRange === 'custom' && (
              <div className="inline-flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">From</span>
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const val = e.target.value
                      if (customEnd && val > customEnd) {
                        setCustomEnd(val)
                      }
                      setCustomStart(val)
                    }}
                    className="rounded-lg border border-gray-200 text-sm px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">To</span>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const val = e.target.value
                      if (customStart && val < customStart) {
                        setCustomStart(val)
                      }
                      setCustomEnd(val)
                    }}
                    className="rounded-lg border border-gray-200 text-sm px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricsCard
              title="Overall Conversion"
              value={`${metrics.conversionRates.overallConversion}%`}
              subtitle="Landing → Booked"
              tooltip="Percentage of landing page visitors who completed the full funnel and booked a call."
              icon={<TrendingUp className="w-5 h-5" />}
              trend={metrics.trends ? { value: metrics.trends.overallConversion } : undefined}
            />
            <MetricsCard
              title="Total Bookings"
              value={metrics.total.callsBooked}
              subtitle={`${metrics.total.bookingsClicked} clicks`}
              tooltip="Confirmed bookings via YouCanBookMe. 'Clicks' counts users who clicked the booking link (some may not complete the booking)."
              icon={<Calendar className="w-5 h-5" />}
              trend={metrics.trends ? { value: metrics.trends.bookings } : undefined}
            />
            <MetricsCard
              title="Email: All Chats"
              value={`${metrics.emailCaptureRateOfStarted}%`}
              subtitle={`${metrics.total.emailsProvided} of ${metrics.total.chatsStarted} started`}
              tooltip="Of everyone who started a chat, what percentage provided their email? This is the most meaningful capture rate — it includes users who dropped off before finishing."
              icon={<Mail className="w-5 h-5" />}
              trend={metrics.trends ? { value: metrics.trends.emailCapture } : undefined}
            />
            <MetricsCard
              title="Email: Completed"
              value={`${metrics.emailCaptureRate}%`}
              subtitle={`${metrics.total.emailsProvided} of ${metrics.total.chatsCompleted} completed`}
              tooltip="Of users who completed the full conversation, what percentage provided their email? This is naturally high because the summary page prompts for email."
              icon={<Mail className="w-5 h-5" />}
            />
          </div>
        )}

        {/* Constraint Breakdown & Engagement */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Constraint Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Constraint Breakdown
              </h3>
              <ConstraintCards breakdown={metrics.constraintBreakdown} />
            </div>

            {/* Engagement Quality */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Engagement
                </h3>
                {metrics.engagement.completedCount > 0 && (
                  <span className="text-xs text-gray-400">
                    {metrics.engagement.completedCount} completed sessions
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold text-gray-900 tabular-nums">
                    {metrics.engagement.medianTurns || '—'}
                  </div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">Median Turns</div>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="text-2xl font-bold text-gray-900 tabular-nums">
                    {metrics.engagement.medianTimeMinutes || '—'}
                  </div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">Median Minutes</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Funnel Visualization */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Conversion Funnel
            </h2>
            {/* Endpoint Filter */}
            <div className="inline-flex bg-gray-50 rounded-lg p-1">
              {(['all', 'ec', 'mist'] as EndpointFilter[]).map((endpoint) => (
                <button
                  key={endpoint}
                  onClick={() => setEndpointFilter(endpoint)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                    endpointFilter === endpoint
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {endpointLabels[endpoint]}
                </button>
              ))}
            </div>
          </div>
          <FunnelChart stages={funnelStages} />
        </div>
      </div>
    </div>
  )
}
