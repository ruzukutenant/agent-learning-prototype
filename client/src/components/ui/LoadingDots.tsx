import { useState, useEffect } from 'react'

type ConversationPhase = 'context' | 'exploration' | 'diagnosis' | 'closing' | 'complete'

// Phase-specific messages that evolve with the conversation
const PHASE_MESSAGES: Record<ConversationPhase, { initial: string[]; deeper: string[] }> = {
  context: {
    initial: [
      "Getting to know your business...",
      "Taking in what you shared...",
      "Understanding your situation...",
    ],
    deeper: [
      "Building a picture of your work...",
      "Noting what matters to you...",
    ],
  },
  exploration: {
    initial: [
      "Exploring that further...",
      "Thinking this through...",
      "Considering what you said...",
      "Reflecting on that...",
    ],
    deeper: [
      "Connecting the dots...",
      "Looking at the bigger picture...",
      "Seeing how this fits together...",
    ],
  },
  diagnosis: {
    initial: [
      "Piecing things together...",
      "Identifying patterns...",
      "Focusing on what stands out...",
    ],
    deeper: [
      "Getting to the heart of it...",
      "Clarifying the core issue...",
    ],
  },
  closing: {
    initial: [
      "Pulling it all together...",
      "Synthesizing your insights...",
      "Preparing your summary...",
    ],
    deeper: [
      "Crafting your next steps...",
      "Finalizing recommendations...",
    ],
  },
  complete: {
    initial: ["Wrapping up..."],
    deeper: ["Almost there..."],
  },
}

// Fallback messages if phase not provided
const DEFAULT_MESSAGES = {
  initial: [
    "Reflecting on what you shared...",
    "Considering your situation...",
    "Thinking this through...",
  ],
  deeper: [
    "Looking at the bigger picture...",
    "Connecting the dots...",
  ],
}

interface LoadingDotsProps {
  message?: string
  conversationPhase?: ConversationPhase
}

export function LoadingDots({ message, conversationPhase }: LoadingDotsProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [displayPhase, setDisplayPhase] = useState<'initial' | 'deeper'>('initial')

  // Get messages for current conversation phase
  const phaseMessages = conversationPhase
    ? PHASE_MESSAGES[conversationPhase]
    : DEFAULT_MESSAGES

  useEffect(() => {
    // If custom message provided, don't rotate
    if (message) return

    // Rotate through initial messages every 2.5 seconds
    const rotateInterval = setInterval(() => {
      setMessageIndex(prev => {
        const messages = displayPhase === 'initial' ? phaseMessages.initial : phaseMessages.deeper
        return (prev + 1) % messages.length
      })
    }, 2500)

    // After 6 seconds, switch to "deeper" messages
    const deeperTimeout = setTimeout(() => {
      setDisplayPhase('deeper')
      setMessageIndex(0)
    }, 6000)

    return () => {
      clearInterval(rotateInterval)
      clearTimeout(deeperTimeout)
    }
  }, [message, displayPhase, phaseMessages])

  // Reset when conversation phase changes
  useEffect(() => {
    setMessageIndex(0)
    setDisplayPhase('initial')
  }, [conversationPhase])

  const displayMessage = message || (
    displayPhase === 'initial'
      ? phaseMessages.initial[messageIndex % phaseMessages.initial.length]
      : phaseMessages.deeper[messageIndex % phaseMessages.deeper.length]
  )

  return (
    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Animated thinking orb */}
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-brand-purple/15 to-brand-purple/5
                      flex items-center justify-center border border-brand-purple/10">
        <div className="relative w-6 h-6">
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full bg-brand-purple/20 animate-ping"
               style={{ animationDuration: '2s' }} />
          <div className="absolute inset-0.5 rounded-full bg-brand-purple/25 animate-ping"
               style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          {/* Center dot */}
          <div className="absolute inset-2 rounded-full bg-brand-purple" />
        </div>
      </div>

      {/* Message with dots */}
      <div className="flex items-center gap-2.5">
        {/* Animated wave dots */}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse"
                style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse"
                style={{ animationDelay: '300ms' }} />
          <span className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse"
                style={{ animationDelay: '600ms' }} />
        </div>

        {/* Rotating message with fade transition */}
        <span
          key={displayMessage}
          className="text-base text-gray-600 animate-in fade-in duration-500"
        >
          {displayMessage}
        </span>
      </div>
    </div>
  )
}
