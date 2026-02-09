import { useEffect, useState } from 'react'

interface InsightToastProps {
  text: string
  onDismiss: () => void
  duration?: number // ms before auto-dismiss
}

export function InsightToast({ text, onDismiss, duration = 5000 }: InsightToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true))

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(onDismiss, 300) // Wait for exit animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]
                  transition-all duration-300 ease-out
                  ${isVisible && !isLeaving
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-4'}`}
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-amber-200/50 overflow-hidden">
        {/* Progress bar that depletes over time */}
        <div className="h-1 bg-amber-100">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all ease-linear"
            style={{
              width: isLeaving ? '0%' : '100%',
              transitionDuration: `${duration}ms`
            }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Lightbulb icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                New Insight
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {text}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
