interface VoiceTransitionProps {
  type: 'to_input' | 'to_output'
}

export function VoiceTransition({ type }: VoiceTransitionProps) {
  const config = type === 'to_input'
    ? {
        icon: '🎤',
        text: 'Your Turn',
        subtext: 'Start speaking...',
        bgColor: 'bg-white/80',
        iconBg: 'bg-gradient-to-br from-brand-purple to-brand-purple/70',
        textColor: 'text-brand-purple',
      }
    : {
        icon: '🔊',
        text: 'CoachMira is Responding',
        subtext: 'Listen...',
        bgColor: 'bg-white/80',
        iconBg: 'bg-gradient-to-br from-brand-teal to-brand-teal/70',
        textColor: 'text-brand-teal',
      }

  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center ${config.bgColor} backdrop-blur-sm animate-fadeIn`}>
      <div className="text-center">
        {/* Large pulsing icon */}
        <div className={`inline-flex items-center justify-center w-28 h-28 ${config.iconBg} rounded-full mb-6 animate-transitionPulse shadow-lg`}>
          <span className="text-7xl">{config.icon}</span>
        </div>

        {/* Text */}
        <div>
          <h3 className={`text-3xl font-bold mb-2 ${config.textColor}`}>
            {config.text}
          </h3>
          <p className="text-base text-gray-600">
            {config.subtext}
          </p>
        </div>
      </div>
    </div>
  )
}
