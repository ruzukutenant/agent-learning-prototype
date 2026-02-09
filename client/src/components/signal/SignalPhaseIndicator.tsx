import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { SignalPhase } from '../../types';
import { SIGNAL_PHASE_ORDER, SIGNAL_PHASE_LABELS } from '../../types';

interface SignalPhaseIndicatorProps {
  currentPhase: SignalPhase;
  className?: string;
}

export function SignalPhaseIndicator({ currentPhase, className }: SignalPhaseIndicatorProps) {
  const currentIndex = SIGNAL_PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className={twMerge('w-full', className)}>
      {/* Phase labels and dots */}
      <div className="flex items-center justify-between mb-2">
        {SIGNAL_PHASE_ORDER.slice(0, -1).map((phase, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div
              key={phase}
              className="flex flex-col items-center"
            >
              {/* Dot */}
              <div
                className={clsx(
                  'w-3 h-3 rounded-full transition-all duration-300',
                  {
                    'bg-brand-teal': isComplete,
                    'bg-brand-purple ring-4 ring-brand-purple/20': isCurrent,
                    'bg-gray-200': isPending,
                  }
                )}
              />
              {/* Label */}
              <span
                className={clsx(
                  'text-xs mt-1 font-medium transition-colors',
                  {
                    'text-brand-teal': isComplete,
                    'text-brand-purple': isCurrent,
                    'text-gray-400': isPending,
                  }
                )}
              >
                {SIGNAL_PHASE_LABELS[phase]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-teal to-brand-purple transition-all duration-500 ease-out"
          style={{
            width: `${Math.max(5, (currentIndex / (SIGNAL_PHASE_ORDER.length - 2)) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
