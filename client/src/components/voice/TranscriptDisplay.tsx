import { useEffect, useRef, useCallback } from 'react'
import type { TranscriptEntry, VoiceStatus } from '../../hooks/useVoiceConversation'
import { AnimatedAssistantText } from './AnimatedAssistantText'

interface TranscriptDisplayProps {
  transcripts: TranscriptEntry[]
  status?: VoiceStatus
}

export function TranscriptDisplay({ transcripts, status }: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom function (used by animation and useEffect)
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Auto-scroll to bottom when new transcripts arrive or status changes
  useEffect(() => {
    scrollToBottom()
  }, [transcripts, status, scrollToBottom])

  if (transcripts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="inline-flex items-center justify-center w-16 h-16
                        bg-gradient-to-br from-gray-100 to-gray-50
                        rounded-full mb-4 shadow-sm">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 font-medium">
            Your conversation will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 stable-scrollbar px-4 md:px-6 py-6"
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {transcripts.map((entry, index) => (
          <div
            key={index}
            className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${
              entry.speaker === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {entry.speaker === 'assistant' ? (
              // Assistant: plain text with optional typing animation
              <div className="text-gray-800 max-w-[85%] md:max-w-[75%]">
                <AnimatedAssistantText
                  text={entry.text}
                  isAnimating={entry.isAnimating ?? false}
                  audioDurationMs={entry.audioDurationMs}
                  onScrollNeeded={scrollToBottom}
                />
              </div>
            ) : (
              // User: white card with shadow and border for premium feel
              <div
                className={`bg-white rounded-3xl px-5 py-4 shadow-md border border-gray-100 max-w-[85%] md:max-w-[75%] ${
                  !entry.isFinal ? 'opacity-70' : ''
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                  {entry.text}
                </p>
                {!entry.isFinal && (
                  <span className="text-xs text-gray-400 mt-1 block italic">
                    (transcribing...)
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {status === 'thinking' && (
          <div className="flex animate-in fade-in slide-in-from-bottom-2 duration-300 justify-start">
            <div className="text-gray-800 max-w-[85%] md:max-w-[75%]">
              <div className="flex items-center gap-1.5 py-2">
                <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-brand-purple rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
