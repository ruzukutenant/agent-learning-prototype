import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Download, LogOut, Search } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'

interface SessionSummary {
  id: string
  user_name: string
  user_email: string
  created_at: string
  status: string
  constraint_category: string | null
  endpoint_selected: string | null
  call_booked: boolean
}

type SessionFilter = 'all' | 'booked' | 'not_booked' | 'completed' | 'in_progress'
type DateRange = 'all' | '7d' | '30d' | '90d' | 'custom'

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

function computeDateParams(dateRange: DateRange, customStart: string, customEnd: string): { startDate?: string; endDate?: string } {
  if (dateRange === 'custom') {
    if (!customStart || !customEnd || customStart > customEnd) return {}
    return {
      startDate: new Date(customStart + 'T00:00:00').toISOString(),
      endDate: new Date(customEnd + 'T23:59:59').toISOString(),
    }
  }
  if (dateRange !== 'all') {
    const endDate = new Date()
    const startDate = new Date()
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    startDate.setDate(endDate.getDate() - days)
    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
  }
  return {}
}

interface Stats {
  totalSessions: number
  completedSessions: number
  completionRate: number
  endpointBreakdown: Record<string, number>
  constraintBreakdown: Record<string, number>
}

export default function Admin() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [filter, setFilter] = useState<SessionFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSessions, setTotalSessions] = useState(0)
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Check for saved authentication on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('adminPassword')
    if (savedPassword) {
      setAdminPassword(savedPassword)
      setIsAuthenticated(true)
      loadDashboardData(savedPassword)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)

    try {
      const result = await api.adminLogin(password)
      if (result.success) {
        // Save password to localStorage to persist across sessions
        localStorage.setItem('adminPassword', password)
        setIsAuthenticated(true)
        setAdminPassword(password)
        setPassword('')
        loadDashboardData(password)
      }
    } catch (error) {
      setLoginError('Invalid password')
    } finally {
      setLoading(false)
    }
  }

  // Fetch only sessions (page/filter/search changes don't affect stats)
  const loadSessions = async (pwd: string, p: number = 1, f: SessionFilter = filter, q: string = search, dr: DateRange = dateRange, cs: string = customStart, ce: string = customEnd) => {
    const dateParams = computeDateParams(dr, cs, ce)
    const result = await api.getAdminSessions(pwd, p, 75, f, q, dateParams.startDate, dateParams.endDate)
    setSessions(result.sessions)
    setTotalPages(result.pagination.totalPages)
    setTotalSessions(result.pagination.total)
  }

  // Fetch stats (only needed when date range changes)
  const loadStats = async (pwd: string, dr: DateRange = dateRange, cs: string = customStart, ce: string = customEnd) => {
    const dateParams = computeDateParams(dr, cs, ce)
    const result = await api.getAdminStats(pwd, dateParams.startDate, dateParams.endDate)
    setStats(result.stats)
  }

  // Full load: sessions + stats in parallel
  const loadDashboardData = async (pwd: string, p: number = 1, f: SessionFilter = filter, q: string = search, dr: DateRange = dateRange, cs: string = customStart, ce: string = customEnd) => {
    if (!stats) setLoading(true)
    try {
      await Promise.all([
        loadSessions(pwd, p, f, q, dr, cs, ce),
        loadStats(pwd, dr, cs, ce),
      ])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setLoading(true)
    loadSessions(adminPassword, newPage).catch(console.error).finally(() => setLoading(false))
  }

  const handleFilterChange = (newFilter: SessionFilter) => {
    setFilter(newFilter)
    setPage(1)
    setLoading(true)
    loadSessions(adminPassword, 1, newFilter, search).catch(console.error).finally(() => setLoading(false))
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setLoading(true)
      loadSessions(adminPassword, 1, filter, value).catch(console.error).finally(() => setLoading(false))
    }, 300)
  }

  const handleDateRangeChange = (range: DateRange) => {
    let cs = customStart
    let ce = customEnd
    if (range === 'custom' && !customStart) {
      const defaults = getDefaultCustomDates()
      cs = defaults.start
      ce = defaults.end
      setCustomStart(cs)
      setCustomEnd(ce)
    }
    setDateRange(range)
    setPage(1)
    loadDashboardData(adminPassword, 1, filter, search, range, cs, ce)
  }

  const customDateDebounce = useRef<ReturnType<typeof setTimeout>>()
  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStart(start)
    setCustomEnd(end)
    if (start && end && start <= end) {
      clearTimeout(customDateDebounce.current)
      customDateDebounce.current = setTimeout(() => {
        setPage(1)
        loadDashboardData(adminPassword, 1, filter, search, 'custom', start, end)
      }, 600)
    }
  }

  const handleExport = async () => {
    try {
      await api.exportAdminCSV(adminPassword)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminPassword')
    setIsAuthenticated(false)
    setAdminPassword('')
    setSessions([])
    setStats(null)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-full border border-gray-200
                           focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
                placeholder="Enter admin password"
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
            <Button
              type="submit"
              size="md"
              className="w-full"
              disabled={loading || !password}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-page py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/funnel')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                       bg-white border border-gray-200 rounded-lg
                       hover:bg-gray-50 hover:border-gray-300
                       transition-all duration-150"
            >
              <BarChart3 className="w-4 h-4" />
              Funnel
            </button>
            <button
              onClick={() => navigate('/admin/split-tests')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                       bg-white border border-gray-200 rounded-lg
                       hover:bg-gray-50 hover:border-gray-300
                       transition-all duration-150"
            >
              A/B Tests
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                       bg-white border border-gray-200 rounded-lg
                       hover:bg-gray-50 hover:border-gray-300
                       transition-all duration-150"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex bg-white rounded-lg border border-gray-200 p-1">
            {(['all', '7d', '30d', '90d', 'custom'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
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
                    const newEnd = customEnd && val > customEnd ? val : customEnd
                    handleCustomDateChange(val, newEnd)
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
                    const newStart = customStart && val < customStart ? val : customStart
                    handleCustomDateChange(newStart, val)
                  }}
                  className="rounded-lg border border-gray-200 text-sm px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-gray-600 text-sm mb-1">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-gray-600 text-sm mb-1">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completedSessions}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-gray-600 text-sm mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.completionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Breakdowns */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Endpoint Breakdown</h3>
              <div className="space-y-3">
                {(() => {
                  const entries = Object.entries(stats.endpointBreakdown)
                  const total = entries.reduce((sum, [, c]) => sum + c, 0)
                  const max = Math.max(...entries.map(([, c]) => c))
                  return entries.map(([endpoint, count]) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    const barWidth = max > 0 ? (count / max) * 100 : 0
                    return (
                      <div key={endpoint}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm text-gray-700">{endpoint || 'None'}</span>
                          <span className="text-sm tabular-nums">
                            <span className="font-semibold text-gray-900">{count}</span>
                            <span className="text-gray-400 ml-1.5">{pct}%</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-400 rounded-full transition-all duration-300"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Constraint Breakdown</h3>
              <div className="space-y-3">
                {(() => {
                  const entries = Object.entries(stats.constraintBreakdown)
                  const total = entries.reduce((sum, [, c]) => sum + c, 0)
                  const max = Math.max(...entries.map(([, c]) => c))
                  const barColors: Record<string, string> = {
                    strategy: 'bg-violet-400',
                    execution: 'bg-orange-400',
                    psychology: 'bg-teal-400',
                  }
                  return entries.map(([constraint, count]) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    const barWidth = max > 0 ? (count / max) * 100 : 0
                    const color = barColors[constraint] || 'bg-gray-300'
                    return (
                      <div key={constraint}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm text-gray-700 capitalize">{constraint || 'None'}</span>
                          <span className="text-sm tabular-nums">
                            <span className="font-semibold text-gray-900">{count}</span>
                            <span className="text-gray-400 ml-1.5">{pct}%</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full transition-all duration-300`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Sessions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center gap-4">
              <h3 className="font-semibold text-gray-900 shrink-0">Recent Sessions</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search name or email..."
                  className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200
                           focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple/30
                           w-56"
                />
              </div>
              {/* Filter buttons */}
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'booked', label: '📞 Led to Call' },
                  { key: 'not_booked', label: '❌ No Call' },
                  { key: 'completed', label: '✅ Completed' },
                  { key: 'in_progress', label: '⏳ In Progress' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleFilterChange(key as SessionFilter)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      filter === key
                        ? 'bg-brand-purple text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Constraint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Call
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    onClick={() => window.open(`/admin/sessions/${session.id}`, '_blank')}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.user_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {session.user_email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          session.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {session.constraint_category || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {session.endpoint_selected || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {session.call_booked ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          📞 Booked
                        </span>
                      ) : session.status === 'completed' ? (
                        <span className="text-gray-400 text-sm">—</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages} ({totalSessions} {filter === 'all' ? 'sessions' : 'matching'})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200
                           hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200
                           hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
