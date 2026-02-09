import type { VoiceStatus as Status } from '../../hooks/useVoiceConversation'

interface VoiceStatusProps {
  status: Status
  onInterrupt?: () => void
}

export function VoiceStatus({ status, onInterrupt }: VoiceStatusProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'idle':
        return {
          text: 'Ready',
          color: 'text-gray-600',
          pulseColor: 'bg-gray-400',
        }
      case 'connecting':
        return {
          text: 'Connecting',
          color: 'text-gray-600',
          pulseColor: 'bg-gray-400',
          showPulse: true,
        }
      case 'connected':
        return {
          text: 'Connected',
          color: 'text-green-600',
          pulseColor: 'bg-green-500',
        }
      case 'ready':
        return {
          text: 'Ready',
          color: 'text-green-600',
          pulseColor: 'bg-green-500',
          showPulse: true,
        }
      case 'output_mode':
        return {
          text: 'Speaking',
          color: 'text-brand-teal',
          pulseColor: 'bg-brand-teal',
          showPulse: true,
          showInterrupt: true,
        }
      case 'transitioning':
        return {
          text: 'Switching',
          color: 'text-gray-500',
          pulseColor: 'bg-gray-400',
        }
      case 'input_mode':
        return {
          text: 'Listening',
          color: 'text-brand-purple',
          pulseColor: 'bg-brand-purple',
          showPulse: true,
        }
      case 'thinking':
        return {
          text: 'Processing',
          color: 'text-brand-indigo',
          pulseColor: 'bg-brand-indigo',
          showPulse: true,
        }
      case 'error':
        return {
          text: 'Error',
          color: 'text-red-600',
          pulseColor: 'bg-red-500',
        }
      case 'disconnected':
        return {
          text: 'Disconnected',
          color: 'text-gray-400',
          pulseColor: 'bg-gray-300',
        }
    }
  }

  const display = getStatusDisplay()

  return (
    <div className="flex items-center gap-3">
      {/* Minimalist pulse indicator */}
      <div className="relative flex items-center justify-center">
        <div
          className={`w-2 h-2 rounded-full ${display.pulseColor} transition-all ${
            display.showPulse ? 'animate-pulse' : ''
          }`}
        />
        {(status === 'input_mode' || status === 'output_mode') && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${display.pulseColor} animate-ping opacity-75`} />
        )}
      </div>

      {/* Clean status text */}
      <span className={`text-sm font-medium ${display.color}`}>
        {display.text}
      </span>

      {/* Refined interrupt button */}
      {display.showInterrupt && onInterrupt && (
        <button
          onClick={onInterrupt}
          className="ml-auto px-4 py-1.5 text-xs font-semibold text-brand-teal bg-brand-teal/10 rounded-full hover:bg-brand-teal/20 border border-brand-teal/20 hover:border-brand-teal/30 transition-all"
        >
          Interrupt
        </button>
      )}
    </div>
  )
}
