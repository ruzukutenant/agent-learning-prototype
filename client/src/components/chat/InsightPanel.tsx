import { useState } from 'react'
import { clsx } from 'clsx'

interface Insight {
  id: string
  text: string
  turnNumber: number
}

interface InsightPanelProps {
  insights: Insight[]
  isVisible?: boolean
}

export function InsightPanel({ insights, isVisible = true }: InsightPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!isVisible || insights.length === 0) {
    return null
  }

  return (
    <div className="fixed right-4 top-24 z-40 w-80 max-w-[90vw] md:max-w-xs">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
            </svg>
            <span className="text-sm font-semibold text-gray-900">
              Your Insights
            </span>
            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {insights.length}
            </span>
          </div>
          <svg
            className={clsx(
              'w-5 h-5 text-gray-600 transition-transform duration-200',
              isExpanded ? 'rotate-180' : ''
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Insights List */}
        {isExpanded && (
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="p-4 space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={insight.id}
                  className="group relative animate-in fade-in slide-in-from-right-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Connector line (except for last item) */}
                  {index < insights.length - 1 && (
                    <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gradient-to-b from-amber-200 to-transparent" />
                  )}

                  <div className="relative flex gap-3">
                    {/* Dot indicator */}
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-sm" />
                    </div>

                    {/* Insight content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {insight.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Turn {insight.turnNumber}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer message */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center italic">
                These are breakthroughs you discovered
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
