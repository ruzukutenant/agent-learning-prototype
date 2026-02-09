import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { SessionTimeline } from './SessionTimeline'

interface Message {
  id: string
  speaker: 'advisor' | 'user'
  message_text: string
  turn_number: number
  created_at: string
  phase: string | null
}

interface SessionDetail {
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


interface SessionDetailModalProps {
  sessionId: string
  adminPassword: string
  onClose: () => void
}

export function SessionDetailModal({ sessionId, adminPassword, onClose }: SessionDetailModalProps) {
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSessionDetail()
  }, [sessionId])

  const loadSessionDetail = async () => {
    try {
      setLoading(true)
      const result = await api.getAdminSessionDetail(sessionId, adminPassword)
      setSession(result.session)
      setMessages(result.messages)
    } catch (err) {
      console.error('Failed to load session:', err)
      setError('Failed to load session details')
    } finally {
      setLoading(false)
    }
  }

  const downloadTranscript = () => {
    if (!session || messages.length === 0) return

    // Build transcript text
    const lines: string[] = []

    // Header
    lines.push('=' .repeat(60))
    lines.push(`CoachMira Conversation Transcript`)
    lines.push('=' .repeat(60))
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

    // Messages
    messages.forEach((msg) => {
      const speaker = msg.speaker === 'user' ? 'USER' : 'MIRA'
      const time = new Date(msg.created_at).toLocaleTimeString()
      lines.push(`[${time}] ${speaker}:`)
      lines.push(msg.message_text)
      lines.push('')
    })

    // Summary if available
    if (session.constraint_summary) {
      lines.push('-'.repeat(60))
      lines.push('ASSESSMENT SUMMARY')
      lines.push('-'.repeat(60))
      lines.push('')
      lines.push(session.constraint_summary)
    }

    // Create and download file
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Session not found'}</p>
          <Button onClick={onClose} size="sm">Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{session.user_name}</h2>
            <p className="text-gray-600 text-sm">{session.user_email || 'No email'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Session Overview */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Session Overview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Created</p>
                <p className="text-gray-900 font-medium">
                  {new Date(session.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Total Turns</p>
                <p className="text-gray-900 font-medium">{session.total_turns}</p>
              </div>
              <div>
                <p className="text-gray-500">Business Type</p>
                <p className="text-gray-900 font-medium">{session.business_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Endpoint Selected</p>
                <p className="text-gray-900 font-medium">{session.endpoint_selected || 'None'}</p>
              </div>
            </div>
          </div>

          {/* Constraint & Scores */}
          {session.constraint_category && (
            <div className="bg-gradient-to-br from-purple-50 to-teal-50 rounded-xl p-6 border border-purple-100">
              <h3 className="font-semibold text-gray-900 mb-4">Assessment Results</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Primary Constraint</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{session.constraint_category}</p>
                  {session.constraint_summary && (
                    <p className="text-sm text-gray-700 mt-2">{session.constraint_summary}</p>
                  )}
                </div>
                {(session.clarity_score || session.confidence_score || session.capacity_score) && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-purple-200">
                    {session.clarity_score && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Clarity</p>
                        <p className="text-2xl font-bold text-brand-purple">{session.clarity_score}/10</p>
                      </div>
                    )}
                    {session.confidence_score && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Confidence</p>
                        <p className="text-2xl font-bold text-brand-purple">{session.confidence_score}/10</p>
                      </div>
                    )}
                    {session.capacity_score && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Capacity</p>
                        <p className="text-2xl font-bold text-brand-purple">{session.capacity_score}/10</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversation Transcript */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Conversation Transcript</h3>
                <p className="text-sm text-gray-600">{messages.length} messages</p>
              </div>
              <button
                onClick={downloadTranscript}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700
                         bg-white border border-gray-300 rounded-lg hover:bg-gray-50
                         transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message) => (
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
                        {message.speaker === 'user' ? 'User' : 'Advisor'}
                      </span>
                      {message.phase && (
                        <span className="text-xs opacity-60 capitalize">({message.phase})</span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
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

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button onClick={onClose} size="md" className="bg-gray-200 text-gray-700">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
