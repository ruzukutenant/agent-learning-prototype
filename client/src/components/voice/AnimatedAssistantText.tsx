import ReactMarkdown from 'react-markdown'
import { useTypingAnimation } from '../../hooks/useTypingAnimation'

interface AnimatedAssistantTextProps {
  text: string
  isAnimating: boolean
  audioDurationMs?: number
  onScrollNeeded?: () => void
}

/**
 * Component that displays assistant text with optional typing animation
 * Animation duration syncs with actual audio playback duration
 * Renders Markdown formatting after animation completes
 */
export function AnimatedAssistantText({ text, isAnimating, audioDurationMs, onScrollNeeded }: AnimatedAssistantTextProps) {
  // Use actual audio duration if available, otherwise estimate based on text length
  const durationMs = audioDurationMs || Math.max(1000, text.length * 25)

  const { displayedText } = useTypingAnimation({
    text,
    isAnimating,
    durationMs,
    onTextChange: onScrollNeeded,
  })

  // During animation, show plain text
  // After animation, render as Markdown for proper formatting
  if (isAnimating) {
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {displayedText}
        <span className="inline-block w-1 h-4 ml-0.5 bg-brand-purple animate-pulse" />
      </p>
    )
  }

  // Render formatted Markdown after animation
  return (
    <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-strong:text-gray-900 prose-strong:font-bold prose-ol:my-2 prose-ul:my-2 prose-li:my-1">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  )
}
