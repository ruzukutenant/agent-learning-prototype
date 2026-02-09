import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface ReadinessSliderProps {
  dimension: 'clarity' | 'confidence' | 'capacity'
  question: string
  onSubmit: (score: number) => void
  submitted?: boolean
  initialValue?: number
}

const DIMENSION_CONFIG = {
  clarity: {
    emoji: '🎯',
    label: 'Clarity',
    color: 'text-purple-600',
    bgColor: 'bg-purple-600',
  },
  confidence: {
    emoji: '💪',
    label: 'Confidence',
    color: 'text-teal-600',
    bgColor: 'bg-teal-600',
  },
  capacity: {
    emoji: '⚡',
    label: 'Capacity',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-600',
  },
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

export function ReadinessSlider({ dimension, question, onSubmit, submitted = false, initialValue = 5 }: ReadinessSliderProps) {
  const [value, setValue] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const config = DIMENSION_CONFIG[dimension]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitted) return
    setIsSubmitting(true)
    onSubmit(value)
  }

  // Custom markdown styling for the question
  const markdownStyles = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
  }

  return (
    <div className="w-full md:max-w-3xl lg:w-full self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Question from AI with markdown support */}
      <div className="text-gray-800 leading-relaxed mb-4">
        <ReactMarkdown components={markdownStyles}>{question}</ReactMarkdown>
      </div>

      {/* Slider card */}
      <form onSubmit={handleSubmit} className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 shadow-sm space-y-6 ${
        submitted ? 'border-green-200 bg-green-50/30' : 'border-gray-200/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.emoji}</span>
            <label className="text-base font-semibold text-gray-900">{config.label}</label>
            {submitted && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Submitted
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-bold ${config.color}`}>{value}</span>
            <span className="text-sm text-gray-500">/10</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Slider track container */}
          <div className="relative h-6 flex items-center">
            {/* Track */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.bgColor} transition-all duration-300 rounded-full`}
                style={{ width: `${((value - 1) / 9) * 100}%` }}
              />
            </div>

            {/* Slider thumb */}
            <div
              className={`absolute w-6 h-6 ${config.bgColor} rounded-full -translate-x-1/2
                         shadow-lg border-3 border-white transition-all duration-300 pointer-events-none
                         ring-4 ring-white/50`}
              style={{ left: `${((value - 1) / 9) * 100}%` }}
            />

            {/* Slider input */}
            <input
              type="range"
              min="1"
              max="10"
              value={value}
              onChange={(e) => setValue(parseInt(e.target.value))}
              disabled={submitted}
              className={`absolute inset-0 w-full opacity-0 ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            />
          </div>

          {/* Tick marks */}
          <div className="flex justify-between px-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
              <div
                key={tick}
                className={`text-sm ${
                  value === tick ? 'text-gray-900 font-semibold' : 'text-gray-400'
                }`}
              >
                {tick}
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-600 text-center pt-2">
          {SCORE_LABELS[value]}
        </p>

        {!submitted && (
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
                Submit Rating
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        )}
      </form>
    </div>
  )
}
