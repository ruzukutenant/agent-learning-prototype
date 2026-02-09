import { Button } from '../ui/Button'

interface VoiceWelcomeModalProps {
  onStart: () => void
  onDecline: () => void
}

export function VoiceWelcomeModal({ onStart, onDecline }: VoiceWelcomeModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onDecline}
    >
      <div
        className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-teal-50
                   rounded-3xl border-2 border-purple-100 shadow-xl shadow-purple-500/10 max-w-md w-full p-8 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brand-teal to-brand-purple rounded-full mb-4 shadow-lg shadow-purple-500/25">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Start Voice Conversation
          </h2>
          <p className="text-sm text-gray-600">
            Have a natural conversation with CoachMira
          </p>
        </div>

        {/* Description */}
        <div className="space-y-5 mb-8">
          <ul className="space-y-4">
            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-brand-teal to-brand-teal/70 text-white rounded-lg font-semibold text-sm shadow-sm">
                1
              </div>
              <div className="pt-0.5">
                <p className="font-semibold text-gray-900 mb-0.5">CoachMira greets you</p>
                <p className="text-sm text-gray-600">Listen to the introduction</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-brand-purple to-brand-purple/70 text-white rounded-lg font-semibold text-sm shadow-sm">
                2
              </div>
              <div className="pt-0.5">
                <p className="font-semibold text-gray-900 mb-0.5">Your turn to speak</p>
                <p className="text-sm text-gray-600">Clear visual indicator when ready</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-brand-indigo to-brand-indigo/70 text-white rounded-lg font-semibold text-sm shadow-sm">
                3
              </div>
              <div className="pt-0.5">
                <p className="font-semibold text-gray-900 mb-0.5">Natural flow</p>
                <p className="text-sm text-gray-600">Speak naturally, pause when done</p>
              </div>
            </li>
          </ul>

          <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 flex gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-amber-900 mb-1">Microphone Access Required</p>
              <p className="text-xs text-amber-800">Your browser will ask for permission to use your microphone.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full"
          >
            Start Voice Conversation
          </Button>

          <button
            onClick={onDecline}
            className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors py-2"
          >
            Use text mode instead
          </button>
        </div>
      </div>
    </div>
  )
}
