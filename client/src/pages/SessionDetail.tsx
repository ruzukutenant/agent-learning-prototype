import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Mail } from 'lucide-react'
import { api } from '../lib/api'
import { SessionTimeline } from '../components/admin/SessionTimeline'

// Get outcome label for transcript download
function getOutcomeLabel(session: SessionData): { label: string; description: string } {
  if (session.call_booked_confirmed) {
    return { label: 'Call Booked', description: `User booked a call${session.call_booked_at ? ` at ${new Date(session.call_booked_at).toLocaleString()}` : ''}` }
  }
  if (session.booking_clicked_at) {
    return { label: 'Clicked Booking Link', description: `User clicked the ${session.booking_clicked_endpoint || 'booking'} link but did not complete booking` }
  }
  if (session.summary_viewed_at) {
    return { label: 'Viewed Summary', description: 'User viewed summary but did not click booking' }
  }
  if (session.chat_completed_at) {
    return { label: 'Chat Completed', description: 'User completed chat but did not view summary' }
  }
  if (session.constraint_category) {
    return { label: 'Assessment Complete, No Action', description: 'Constraint was identified but user did not proceed' }
  }
  return { label: 'In Progress / Abandoned', description: 'Session did not reach a conclusion' }
}

interface Message {
  id: string
  speaker: 'advisor' | 'user'
  message_text: string
  turn_number: number
  created_at: string
  phase: string | null
}

interface SessionData {
  id: string
  user_name: string
  user_email: string
  created_at: string
  constraint_category: string | null
  constraint_summary: string | null
  clarity_score: number | null
  confidence_score: number | null
  capacity_score: number | null
  endpoint_selected: string | null
  email_sent: boolean | null
  business_type: string | null
  surface_challenge: string | null
  total_turns: number
  // Funnel tracking fields
  chat_completed_at: string | null
  summary_viewed_at: string | null
  booking_clicked_at: string | null
  booking_clicked_endpoint: string | null
  call_booked_at: string | null
  call_booked_confirmed: boolean | null
}

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<SessionData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Check for saved authentication on mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('adminPassword')
    if (savedPassword) {
      setAdminPassword(savedPassword)
      setIsAuthenticated(true)
    } else {
      setLoading(false)
    }
  }, [])

  // Load session when authenticated
  useEffect(() => {
    if (isAuthenticated && sessionId && adminPassword) {
      loadSessionDetail()
    }
  }, [isAuthenticated, sessionId, adminPassword])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoading(true)

    try {
      const result = await api.adminLogin(password)
      if (result.success) {
        localStorage.setItem('adminPassword', password)
        setAdminPassword(password)
        setIsAuthenticated(true)
        setPassword('')
      }
    } catch {
      setLoginError('Invalid password')
      setLoading(false)
    }
  }

  const loadSessionDetail = async () => {
    if (!sessionId) return

    try {
      setLoading(true)
      const result = await api.getAdminSessionDetail(sessionId, adminPassword)
      setSession(result.session)
      setMessages(result.messages)
    } catch (err) {
      console.error('Failed to load session:', err)
      setError('Failed to load session details. The session may not exist or you may not have access.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTranscript = () => {
    if (!session || messages.length === 0) return

    const lines: string[] = []

    lines.push('='.repeat(60))
    lines.push('CoachMira Conversation Transcript')
    lines.push('='.repeat(60))
    lines.push('')
    lines.push(`User: ${session.user_name}`)
    lines.push(`Email: ${session.user_email || 'Not provided'}`)
    lines.push(`Date: ${new Date(session.created_at).toLocaleString()}`)
    lines.push(`Total Turns: ${session.total_turns}`)
    if (session.constraint_category) {
      lines.push(`Constraint: ${session.constraint_category}`)
    }
    if (session.endpoint_selected) {
      lines.push(`Endpoint: ${session.endpoint_selected}`)
    }
    lines.push('')
    lines.push('-'.repeat(60))
    lines.push('CONVERSATION')
    lines.push('-'.repeat(60))
    lines.push('')

    messages.forEach((msg) => {
      const speaker = msg.speaker === 'user' ? 'USER' : 'MIRA'
      const time = new Date(msg.created_at).toLocaleTimeString()
      lines.push(`[${time}] ${speaker}:`)
      lines.push(msg.message_text)
      lines.push('')
    })

    // Add session outcome
    lines.push('-'.repeat(60))
    lines.push('SESSION OUTCOME')
    lines.push('-'.repeat(60))
    lines.push('')
    const outcome = getOutcomeLabel(session)
    lines.push(`Status: ${outcome.label}`)
    lines.push(`${outcome.description}`)
    lines.push('')
    if (session.chat_completed_at) {
      lines.push(`✓ Chat completed: ${new Date(session.chat_completed_at).toLocaleString()}`)
    }
    if (session.summary_viewed_at) {
      lines.push(`✓ Summary viewed: ${new Date(session.summary_viewed_at).toLocaleString()}`)
    }
    if (session.booking_clicked_at) {
      lines.push(`✓ Booking clicked (${session.booking_clicked_endpoint}): ${new Date(session.booking_clicked_at).toLocaleString()}`)
    }
    if (session.call_booked_at) {
      lines.push(`✓ Call booked: ${new Date(session.call_booked_at).toLocaleString()}`)
    }
    if (!session.chat_completed_at && !session.summary_viewed_at && !session.booking_clicked_at && !session.call_booked_at) {
      lines.push('✗ User left without completing session or taking action')
    }
    lines.push('')

    if (session.constraint_summary) {
      lines.push('-'.repeat(60))
      lines.push('ASSESSMENT SUMMARY')
      lines.push('-'.repeat(60))
      lines.push('')
      lines.push(session.constraint_summary)
    }

    const content = lines.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${session.user_name.replace(/\s+/g, '-').toLowerCase()}-${new Date(session.created_at).toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Transcript</h1>
          <p className="text-gray-600 mb-6">Enter the admin password to view this session.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                placeholder="Enter password"
                autoFocus
              />
            </div>

            {loginError && (
              <p className="text-red-600 text-sm">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={!password || loading}
              className="w-full py-3 px-4 bg-gray-900 text-white font-semibold rounded-xl
                       hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            >
              {loading ? 'Checking...' : 'View Session'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This session could not be loaded.'}</p>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                     bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Admin
          </button>
        </div>
      </div>
    )
  }

  // Main content
  return (
    <div className="min-h-screen bg-gradient-page py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                     bg-white border border-gray-200 rounded-lg hover:bg-gray-50
                     transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </button>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                onClick={() => {
                  if (!session?.email_sent) return
                  const baseUrl = import.meta.env.VITE_API_URL || ''
                  const url = `${baseUrl}/api/admin/sessions/${sessionId}/email-preview?token=${encodeURIComponent(adminPassword)}`
                  window.open(url, '_blank')
                }}
                disabled={!session?.email_sent}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  session?.email_sent
                    ? 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                    : 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed'
                }`}
              >
                <Mail className="w-4 h-4" />
                View Summary Email
              </button>
              {!session?.email_sent && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-gray-800 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  User did not request a summary email
                </div>
              )}
            </div>
            <button
              onClick={downloadTranscript}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700
                       bg-white border border-gray-200 rounded-lg hover:bg-gray-50
                       transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Transcript
            </button>
          </div>
        </div>

        {/* Session Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">{session.user_name}</h1>
            <p className="text-gray-600">{session.user_email || 'No email provided'}</p>
          </div>

          <div className="p-6 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Date</p>
                <p className="text-gray-900 font-medium">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Total Turns</p>
                <p className="text-gray-900 font-medium">{session.total_turns}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Constraint</p>
                <p className="text-gray-900 font-medium capitalize">
                  {session.constraint_category || 'Not determined'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Endpoint</p>
                <p className="text-gray-900 font-medium">
                  {session.endpoint_selected || 'None selected'}
                </p>
              </div>
            </div>
          </div>

          {/* Assessment Results */}
          {session.constraint_summary && (
            <div className="p-6 border-t border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Assessment Summary</h3>
              <p className="text-gray-700 text-sm">{session.constraint_summary}</p>

              {(session.clarity_score || session.confidence_score || session.capacity_score) && (
                <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
                  {session.clarity_score && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Clarity</p>
                      <p className="text-xl font-bold text-brand-purple">{session.clarity_score}/10</p>
                    </div>
                  )}
                  {session.confidence_score && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Confidence</p>
                      <p className="text-xl font-bold text-brand-purple">{session.confidence_score}/10</p>
                    </div>
                  )}
                  {session.capacity_score && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Capacity</p>
                      <p className="text-xl font-bold text-brand-purple">{session.capacity_score}/10</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Conversation Transcript</h2>
            <p className="text-sm text-gray-600">{messages.length} messages</p>
          </div>

          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No messages in this session.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.speaker === 'user'
                        ? 'bg-brand-purple text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs opacity-70 font-medium">
                        {message.speaker === 'user' ? session.user_name : 'Mira'}
                      </span>
                      {message.phase && (
                        <span className="text-xs opacity-50 capitalize">({message.phase})</span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Session Timeline */}
          <SessionTimeline
            chatCompletedAt={session.chat_completed_at}
            summaryViewedAt={session.summary_viewed_at}
            bookingClickedAt={session.booking_clicked_at}
            bookingClickedEndpoint={session.booking_clicked_endpoint}
            callBookedAt={session.call_booked_at}
            callBookedConfirmed={session.call_booked_confirmed}
          />
        </div>
      </div>
    </div>
  )
}
