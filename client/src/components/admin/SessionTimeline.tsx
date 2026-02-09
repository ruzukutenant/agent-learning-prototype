import { CheckCircle, Circle, MessageSquare, FileText, MousePointerClick, CalendarCheck } from 'lucide-react'

interface TimelineEvent {
  id: string
  label: string
  detail?: string
  timestamp: string | null
  icon: React.ComponentType<{ className?: string }>
}

interface SessionTimelineProps {
  chatCompletedAt: string | null
  summaryViewedAt: string | null
  bookingClickedAt: string | null
  bookingClickedEndpoint: string | null
  callBookedAt: string | null
  callBookedConfirmed: boolean | null
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getElapsedTime(from: string, to: string): string {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const diffMs = toDate.getTime() - fromDate.getTime()

  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) return `${diffDays}d later`
  if (diffHours > 0) return `${diffHours}h later`
  if (diffMins > 0) return `${diffMins}m later`
  return 'moments later'
}

function getOutcomeStatus(props: SessionTimelineProps): {
  label: string
  color: 'emerald' | 'amber' | 'slate'
  description: string
} {
  if (props.callBookedConfirmed) {
    return {
      label: 'Call Booked',
      color: 'emerald',
      description: 'User completed the booking process',
    }
  }
  if (props.bookingClickedAt) {
    return {
      label: 'Booking Started',
      color: 'amber',
      description: 'User clicked booking link but did not complete',
    }
  }
  if (props.summaryViewedAt) {
    return {
      label: 'Summary Viewed',
      color: 'amber',
      description: 'User viewed summary but did not proceed to booking',
    }
  }
  if (props.chatCompletedAt) {
    return {
      label: 'Chat Completed',
      color: 'amber',
      description: 'User completed chat but did not view summary',
    }
  }
  return {
    label: 'In Progress',
    color: 'slate',
    description: 'Session did not reach completion',
  }
}

export function SessionTimeline(props: SessionTimelineProps) {
  const {
    chatCompletedAt,
    summaryViewedAt,
    bookingClickedAt,
    bookingClickedEndpoint,
    callBookedAt,
    callBookedConfirmed,
  } = props

  const events: TimelineEvent[] = [
    {
      id: 'chat',
      label: 'Chat Completed',
      timestamp: chatCompletedAt,
      icon: MessageSquare,
    },
    {
      id: 'summary',
      label: 'Summary Viewed',
      timestamp: summaryViewedAt,
      icon: FileText,
    },
    {
      id: 'click',
      label: 'Booking Clicked',
      detail: bookingClickedEndpoint ? `via ${bookingClickedEndpoint}` : undefined,
      timestamp: bookingClickedAt,
      icon: MousePointerClick,
    },
    {
      id: 'booked',
      label: callBookedConfirmed ? 'Call Booked' : 'Booking Pending',
      timestamp: callBookedAt,
      icon: CalendarCheck,
    },
  ]

  const outcome = getOutcomeStatus(props)
  const completedCount = events.filter((e) => e.timestamp).length

  const colorClasses = {
    emerald: {
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      dot: 'bg-emerald-500',
      line: 'bg-emerald-200',
      icon: 'text-emerald-600 bg-emerald-50 ring-emerald-500/20',
    },
    amber: {
      badge: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      dot: 'bg-amber-500',
      line: 'bg-amber-200',
      icon: 'text-amber-600 bg-amber-50 ring-amber-500/20',
    },
    slate: {
      badge: 'bg-slate-100 text-slate-600 ring-slate-500/20',
      dot: 'bg-slate-400',
      line: 'bg-slate-200',
      icon: 'text-slate-500 bg-slate-50 ring-slate-400/20',
    },
  }[outcome.color]

  return (
    <div className="border-t border-slate-200">
      {/* Outcome Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ring-1 ring-inset ${colorClasses.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${colorClasses.dot}`} />
              {outcome.label}
            </span>
            <span className="text-sm text-slate-500">{outcome.description}</span>
          </div>
          <span className="text-xs text-slate-400 tabular-nums">
            {completedCount} of {events.length} steps
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />

          {/* Events */}
          <div className="space-y-0">
            {events.map((event, index) => {
              const isCompleted = !!event.timestamp
              const prevEvent = index > 0 ? events[index - 1] : null
              const elapsed =
                isCompleted && prevEvent?.timestamp && event.timestamp
                  ? getElapsedTime(prevEvent.timestamp, event.timestamp)
                  : null

              const Icon = event.icon

              return (
                <div key={event.id} className="relative flex items-start gap-4 py-2.5">
                  {/* Icon node */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white transition-all ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" strokeWidth={1.5} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isCompleted ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {event.label}
                      </span>
                      {event.detail && isCompleted && (
                        <span className="text-xs text-slate-500">{event.detail}</span>
                      )}
                    </div>

                    {isCompleted && event.timestamp ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 tabular-nums">
                          {formatTimestamp(event.timestamp)}
                        </span>
                        {elapsed && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-slate-400">{elapsed}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Not reached
                      </span>
                    )}
                  </div>

                  {/* Decorative icon */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                      isCompleted ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
