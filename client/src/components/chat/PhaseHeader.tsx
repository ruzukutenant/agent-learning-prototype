import { useState, useRef, useEffect } from 'react'

// Orchestrator phase type - matches backend phases
type OrchestratorPhase = 'context' | 'exploration' | 'diagnosis' | 'closing' | 'complete'

interface Insight {
  id: string
  text: string
  turnNumber: number
  phase?: string
}

interface PhaseHeaderProps {
  isComplete?: boolean
  phase?: OrchestratorPhase
}

/**
 * Phase-based progress configuration
 * Progress is determined by orchestrator phase, not turn count
 */
const phaseConfig: Record<OrchestratorPhase, { label: string; progress: number }> = {
  context: { label: 'Getting started', progress: 15 },
  exploration: { label: 'Exploring', progress: 40 },
  diagnosis: { label: 'Clarifying', progress: 70 },
  closing: { label: 'Your insights', progress: 90 },
  complete: { label: 'Complete', progress: 100 },
}

/**
 * Get phase info based on orchestrator phase
 */
function getPhaseInfo(
  phase: OrchestratorPhase | undefined,
  isComplete: boolean
): { label: string; progress: number; stage: 'early' | 'mid' | 'late' | 'complete' } {
  if (isComplete) {
    return { ...phaseConfig.complete, stage: 'complete' }
  }

  if (!phase || !phaseConfig[phase]) {
    return { label: 'Getting started', progress: 10, stage: 'early' }
  }

  const config = phaseConfig[phase]
  const stage = config.progress <= 30 ? 'early'
    : config.progress <= 60 ? 'mid'
    : config.progress < 100 ? 'late'
    : 'complete'

  return { ...config, stage }
}

interface PhaseHeaderExtendedProps extends PhaseHeaderProps {
  onSaveProgress?: () => void
  onSwitchToVoice?: () => void
  insights?: Insight[]
  onHeightChange?: (height: number) => void
}

export function PhaseHeader({
  isComplete = false,
  phase,
  onSaveProgress,
  onSwitchToVoice,
  insights = [],
  onHeightChange
}: PhaseHeaderExtendedProps) {
  const [showInsightsDropdown, setShowInsightsDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  // Report header height changes so chat container can adjust padding
  useEffect(() => {
    if (!headerRef.current || !onHeightChange) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChange(entry.contentRect.height + 32) // +32 for py-4 padding (16px * 2)
      }
    })
    observer.observe(headerRef.current)
    return () => observer.disconnect()
  }, [onHeightChange])

  // Phase-based progress (no longer dependent on turn count)
  const phaseInfo = getPhaseInfo(phase, isComplete)

  // Progress bar gradient colors based on stage
  const stageColors = {
    early: 'from-violet-400 to-purple-500',
    mid: 'from-purple-500 to-indigo-500',
    late: 'from-indigo-500 to-violet-600',
    complete: 'from-teal-500 to-emerald-500'
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowInsightsDropdown(false)
      }
    }

    if (showInsightsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showInsightsDropdown])

  return (
    <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4">
      {/* Pure glassmorphism - transparent with blur, no gradient overlay */}
      <div className="absolute inset-0 backdrop-blur-2xl bg-white/5" />

      {/* Subtle bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="relative max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
        {/* Top Row: Branding + Actions */}
        <div className="flex items-center justify-between mb-3">
          {/* Left: Branding */}
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-gray-900 drop-shadow-sm">
              CoachMira Advisor
            </h1>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Insights Badge */}
            {insights.length > 0 && (
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={() => setShowInsightsDropdown(!showInsightsDropdown)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                             rounded-full backdrop-blur-md shadow-sm
                             transition-all duration-200
                             hover:scale-105 active:scale-95
                             ${showInsightsDropdown
                               ? 'bg-amber-100 text-amber-700 border border-amber-300'
                               : 'bg-amber-50/80 text-amber-600 border border-amber-200/70 hover:bg-amber-100 hover:border-amber-300'
                             }`}
                  title="View your insights"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                  <span>{insights.length}</span>
                </button>

                {/* Insights Dropdown */}
                {showInsightsDropdown && (
                  <div
                    ref={dropdownRef}
                    className="absolute right-0 top-full mt-2 w-80 max-w-[90vw]
                               bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50
                               animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-2xl">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">
                          Your Insights
                        </span>
                      </div>
                    </div>

                    {/* Insights List - grouped by phase */}
                    <div className="max-h-[60vh] overflow-y-auto p-4">
                      {(() => {
                        // Group insights by phase
                        const phaseLabels: Record<string, string> = {
                          context: 'Getting Started',
                          exploration: 'Exploring',
                          diagnosis: 'Clarifying',
                          closing: 'Wrapping Up',
                          complete: 'Complete'
                        }

                        const grouped = insights.reduce((acc, insight) => {
                          const phase = insight.phase || 'exploration'
                          if (!acc[phase]) acc[phase] = []
                          acc[phase].push(insight)
                          return acc
                        }, {} as Record<string, typeof insights>)

                        const phaseOrder = ['context', 'exploration', 'diagnosis', 'closing', 'complete']
                        const sortedPhases = Object.keys(grouped).sort(
                          (a, b) => phaseOrder.indexOf(a) - phaseOrder.indexOf(b)
                        )

                        // If only one phase, don't show headers
                        const showPhaseHeaders = sortedPhases.length > 1

                        return sortedPhases.map((phase, phaseIndex) => (
                          <div key={phase} className={phaseIndex > 0 ? 'mt-4' : ''}>
                            {showPhaseHeaders && (
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                                {phaseLabels[phase] || phase}
                              </p>
                            )}
                            <div className="space-y-2.5">
                              {grouped[phase].map((insight, index) => (
                                <div key={insight.id} className="relative flex gap-3">
                                  {/* Connector line (except for last item in group) */}
                                  {index < grouped[phase].length - 1 && (
                                    <div className="absolute left-[5px] top-4 bottom-0 w-px bg-gradient-to-b from-amber-200 to-transparent" />
                                  )}

                                  {/* Dot indicator */}
                                  <div className="flex-shrink-0 mt-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500" />
                                  </div>

                                  {/* Insight content - sentence case */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                      {insight.text.charAt(0).toUpperCase() + insight.text.slice(1)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                      <p className="text-xs text-gray-500 text-center">
                        Breakthroughs from your conversation
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {onSaveProgress && (
              <button
                onClick={onSaveProgress}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white
                           bg-brand-teal hover:bg-teal-600 rounded-full
                           shadow-sm shadow-teal-500/20
                           transition-all duration-200
                           hover:scale-105 active:scale-95"
                title="Save Progress"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
                  <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="17 21 17 13 7 13 7 21" />
                  <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="7 3 7 8 15 8" />
                </svg>
                <span>Save</span>
              </button>
            )}
            {onSwitchToVoice && (
              <button
                onClick={onSwitchToVoice}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700
                           bg-white/40 hover:bg-white/60 rounded-full
                           border border-gray-200/50 hover:border-gray-300/70
                           backdrop-blur-md shadow-sm
                           transition-all duration-200
                           hover:scale-105 active:scale-95"
                title="Switch to voice"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <span className="hidden sm:inline">Voice</span>
              </button>
            )}
          </div>
        </div>

        {/* Phase Progress */}
        <div>
          {/* Phase label */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">
              {phaseInfo.label}
            </span>
            <span className="text-xs text-gray-400 tabular-nums">
              {Math.round(phaseInfo.progress)}%
            </span>
          </div>

          {/* Progress bar with phase-specific gradient */}
          <div className="h-1.5 bg-gray-900/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className={`h-full bg-gradient-to-r ${stageColors[phaseInfo.stage]} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${phaseInfo.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
