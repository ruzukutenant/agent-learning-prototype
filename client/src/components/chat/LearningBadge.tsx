import { clsx } from 'clsx'

export type BadgeType = 'insight' | 'milestone' | 'contradiction' | 'stress_test'

interface LearningBadgeProps {
  type: BadgeType
  text?: string
}

const badgeConfig: Record<BadgeType, {
  label: string
  icon: JSX.Element
  colors: string
  animationClass: string
}> = {
  insight: {
    label: 'Key Insight',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
      </svg>
    ),
    colors: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white',
    animationClass: 'animate-in fade-in zoom-in duration-500'
  },
  milestone: {
    label: 'Breakthrough',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    colors: 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white',
    animationClass: 'animate-in fade-in zoom-in-bounce duration-700'
  },
  contradiction: {
    label: 'Exploring Tension',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
    colors: 'bg-gradient-to-r from-purple-400 to-indigo-500 text-white',
    animationClass: 'animate-in fade-in slide-in-from-left-2 duration-500'
  },
  stress_test: {
    label: 'Reality Check',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    colors: 'bg-gradient-to-r from-orange-400 to-red-500 text-white',
    animationClass: 'animate-in fade-in zoom-in duration-500'
  }
}

export function LearningBadge({ type, text }: LearningBadgeProps) {
  const config = badgeConfig[type]

  return (
    <div className={clsx(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm',
      config.colors,
      config.animationClass
    )}>
      {config.icon}
      <span>{text || config.label}</span>
    </div>
  )
}

// Keyframe animations for bounce effect (add to your tailwind config or global CSS)
// @keyframes zoom-in-bounce {
//   0% { transform: scale(0); }
//   50% { transform: scale(1.1); }
//   100% { transform: scale(1); }
// }
