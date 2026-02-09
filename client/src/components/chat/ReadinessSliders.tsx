import { useState } from 'react'

interface ReadinessSlidersProps {
  onSubmit: (scores: { clarity: number; confidence: number; capacity: number }) => void
  context?: string
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Below Average',
  4: 'Slightly Below',
  5: 'Average',
  6: 'Slightly Above',
  7: 'Good',
  8: 'Very Good',
  9: 'Excellent',
  10: 'Outstanding',
}

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  icon: string
  color: string
}

function Slider({ label, value, onChange, icon, color }: SliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <label className="text-sm font-semibold text-gray-900">{label}</label>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${color}`}>{value}</span>
          <span className="text-xs text-gray-500">/10</span>
        </div>
      </div>

      <div className="relative">
        {/* Track */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-300 rounded-full`}
            style={{ width: `${value * 10}%` }}
          />
        </div>

        {/* Slider input */}
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
        />

        {/* Tick marks */}
        <div className="flex justify-between mt-1 px-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
            <div
              key={tick}
              className={`text-xs ${
                value === tick ? 'text-gray-900 font-semibold' : 'text-gray-400'
              }`}
            >
              {tick}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-600 text-center">
        {SCORE_LABELS[value]}
      </p>
    </div>
  )
}

export function ReadinessSliders({ onSubmit, context }: ReadinessSlidersProps) {
  const [clarity, setClarity] = useState(5)
  const [confidence, setConfidence] = useState(5)
  const [capacity, setCapacity] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    onSubmit({ clarity, confidence, capacity })
  }

  return (
    <div className="max-w-[85%] md:max-w-[75%] self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Message from advisor */}
      {context && (
        <p className="text-gray-800 leading-relaxed mb-4">{context}</p>
      )}

      {/* Sliders card */}
      <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-gray-200/50 shadow-sm space-y-6">
        <div className="space-y-6">
          <Slider
            label="Clarity"
            value={clarity}
            onChange={setClarity}
            icon="🎯"
            color="text-purple-600"
          />

          <Slider
            label="Confidence"
            value={confidence}
            onChange={setConfidence}
            icon="💪"
            color="text-teal-600"
          />

          <Slider
            label="Capacity"
            value={capacity}
            onChange={setCapacity}
            icon="⚡"
            color="text-indigo-600"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-4
                   bg-gradient-to-r from-brand-teal to-brand-purple
                   text-white font-semibold rounded-2xl
                   hover:shadow-lg hover:scale-[1.02]
                   active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200
                   flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting...
            </>
          ) : (
            <>
              Submit Ratings
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
