import { useNavigate } from 'react-router-dom'

interface ContinueToAssessmentCardProps {
  sessionId: string
}

export function ContinueToAssessmentCard({ sessionId }: ContinueToAssessmentCardProps) {
  const navigate = useNavigate()

  return (
    <div className="px-4 pb-4">
      <div className="max-w-2xl mx-auto bg-gradient-to-br from-gray-100/70 to-white backdrop-blur-md rounded-2xl p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_6px_20px_-3px_rgba(0,0,0,0.06)] border border-gray-200/60 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-[0_4px_16px_-3px_rgba(0,0,0,0.1),0_8px_24px_-4px_rgba(0,0,0,0.08)] transition-all">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-brand-teal to-brand-purple rounded-full mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Great! We've identified your core constraint.
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Next, let's quickly assess where you are with this—your clarity, confidence, and capacity to address it. This helps us match you with the right next step.
          </p>
        </div>
        <button
          onClick={() => navigate(`/assess/${sessionId}`)}
          className="w-full bg-gradient-to-r from-brand-teal to-brand-purple text-white font-semibold py-4 px-8 rounded-xl hover:shadow-lg transition-all text-lg"
        >
          Continue to Assessment →
        </button>
      </div>
    </div>
  )
}
